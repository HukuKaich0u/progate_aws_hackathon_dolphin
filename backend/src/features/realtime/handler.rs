use std::sync::Arc;

use axum::{
    extract::{
        Path, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use tracing::warn;
use uuid::Uuid;

use crate::{
    app::state::AppState,
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        realtime::{dto::SnapshotEvent, store::RealtimeStore, usecase::ensure_room_membership},
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
    if let Err(error) = realtime_store.upsert_presence(room_id, &user.user_id).await {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to upsert presence");
        return;
    }

    let send_result = async {
        let snapshot = realtime_store.snapshot(room_id).await?;
        let payload = serde_json::to_string(&SnapshotEvent::new(room_id, snapshot.participants))
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        socket
            .send(Message::Text(payload.into()))
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))
    }
    .await;

    if let Err(error) = send_result {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to send websocket snapshot");
    }

    if let Err(error) = realtime_store.remove_presence(room_id, &user.user_id).await {
        warn!(room_id = %room_id, user_id = %user.user_id, error = %error, "failed to remove presence");
    }
}
