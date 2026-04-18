use std::sync::Arc;

use axum::{
    extract::{
        Path, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use futures_util::StreamExt;
use tracing::{info, warn};
use uuid::Uuid;

use crate::{
    app::state::AppState,
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        realtime::{
            dto::{ClientRealtimeEvent, ServerRealtimeEvent},
            store::RealtimeStore,
            usecase::ensure_room_membership,
        },
    },
    infra::db::rooms_store::SqlxRoomLifecycleStore,
};

pub async fn websocket_room_handler(
    ws: WebSocketUpgrade,
    Path(room_id): Path<Uuid>,
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Response, AppError> {
    let store = SqlxRoomLifecycleStore::new(state.db_pool.clone());
    ensure_room_membership(&store, room_id, &user).await?;

    let realtime_store = state.realtime_store.clone();

    Ok(ws.on_upgrade(move |socket| handle_socket(socket, realtime_store, room_id, user)))
}

async fn handle_socket(
    mut socket: WebSocket,
    realtime_store: Arc<dyn RealtimeStore>,
    room_id: Uuid,
    user: AuthenticatedUser,
) {
    let mut subscription = match realtime_store.subscribe(room_id).await {
        Ok(subscription) => subscription,
        Err(error) => {
            warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to subscribe realtime events");
            return;
        }
    };

    if let Err(error) = realtime_store.upsert_presence(room_id, &user.user_id).await {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to upsert presence");
        return;
    }

    let snapshot = match realtime_store.snapshot(room_id).await {
        Ok(snapshot) => snapshot,
        Err(error) => {
            warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to build snapshot");
            let _ = cleanup_disconnect(&*realtime_store, room_id, &user).await;
            return;
        }
    };

    if let Err(error) = send_event(
        &mut socket,
        ServerRealtimeEvent::snapshot(room_id, snapshot.participants),
    )
    .await
    {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to send websocket snapshot");
        let _ = cleanup_disconnect(&*realtime_store, room_id, &user).await;
        return;
    }

    if let Err(error) = realtime_store
        .publish(
            room_id,
            ServerRealtimeEvent::presence_joined(room_id, user.user_id.clone()),
        )
        .await
    {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to publish presence.joined");
    } else {
        info!(room_id = %room_id, user_id = %user.user_id, "ws_connected");
    }

    loop {
        tokio::select! {
            inbound = socket.recv() => {
                match inbound {
                    Some(Ok(Message::Text(text))) => {
                        if let Err(error) = handle_client_message(&*realtime_store, room_id, &user, &mut socket, &text).await {
                            warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to handle websocket client message");
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(_)) => {}
                    Some(Err(error)) => {
                        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "websocket receive failed");
                        break;
                    }
                }
            }
            outbound = subscription.next() => {
                match outbound {
                    Some(Ok(event)) => {
                        if let Err(error) = send_event(&mut socket, event).await {
                            warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to forward realtime event");
                            break;
                        }
                    }
                    Some(Err(error)) => {
                        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "realtime subscription failed");
                    }
                    None => break,
                }
            }
        }
    }

    if let Err(error) = cleanup_disconnect(&*realtime_store, room_id, &user).await {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to clean realtime disconnect");
    } else {
        info!(room_id = %room_id, user_id = %user.user_id, "ws_disconnected");
    }
}

async fn handle_client_message(
    realtime_store: &dyn RealtimeStore,
    room_id: Uuid,
    user: &AuthenticatedUser,
    socket: &mut WebSocket,
    text: &str,
) -> Result<(), AppError> {
    let event = serde_json::from_str::<ClientRealtimeEvent>(text)
        .map_err(|source| AppError::Dependency(source.to_string()));

    match event {
        Ok(ClientRealtimeEvent::MuteSet { muted }) => {
            realtime_store
                .set_mute(room_id, &user.user_id, muted)
                .await?;
            realtime_store
                .publish(
                    room_id,
                    ServerRealtimeEvent::mute_updated(room_id, user.user_id.clone(), muted),
                )
                .await?;
            info!(room_id = %room_id, user_id = %user.user_id, muted, "mute_updated");
        }
        Err(_) => {
            send_event(
                socket,
                ServerRealtimeEvent::Error {
                    code: "bad_request".to_owned(),
                },
            )
            .await?;
        }
    }

    Ok(())
}

async fn cleanup_disconnect(
    realtime_store: &dyn RealtimeStore,
    room_id: Uuid,
    user: &AuthenticatedUser,
) -> Result<(), AppError> {
    realtime_store
        .remove_presence(room_id, &user.user_id)
        .await?;
    realtime_store
        .publish(
            room_id,
            ServerRealtimeEvent::presence_left(room_id, user.user_id.clone()),
        )
        .await?;

    Ok(())
}

async fn send_event(socket: &mut WebSocket, event: ServerRealtimeEvent) -> Result<(), AppError> {
    let payload =
        serde_json::to_string(&event).map_err(|source| AppError::Dependency(source.to_string()))?;
    socket
        .send(Message::Text(payload.into()))
        .await
        .map_err(|source| AppError::Dependency(source.to_string()))
}
