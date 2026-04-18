mod support;

use std::sync::Arc;

use axum::{body::Body, http::Request};
use backend::{
    app::router::create_router,
    features::{realtime::dto::SnapshotEvent, rooms::dto::RoomResponse},
};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use sqlx::PgPool;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Message, client::IntoClientRequest},
};
use tower::util::ServiceExt;

use crate::support::{
    FakeRealtimeStore, FakeTokenVerifier, spawn_app, test_state_with_pool_and_realtime_store,
};

#[sqlx::test]
async fn websocket_rejects_user_without_active_attendee(pool: PgPool) -> sqlx::Result<()> {
    let realtime_store = Arc::new(FakeRealtimeStore::default());
    let app = create_router(test_state_with_pool_and_realtime_store(
        pool,
        Arc::new(FakeTokenVerifier::new("user-1")),
        realtime_store,
    ));
    let room = create_room(&app).await;
    let base_url = spawn_app(app).await;

    let mut request = format!("{base_url}/v1/ws/rooms/{}", room.room_id)
        .replace("http://", "ws://")
        .into_client_request()
        .expect("request should build");
    request.headers_mut().insert(
        "authorization",
        "Bearer test-token".parse().expect("header should parse"),
    );

    let error = connect_async(request)
        .await
        .expect_err("non-member should be rejected");

    assert!(
        error.to_string().contains("401"),
        "expected 401 rejection, got {error}"
    );

    Ok(())
}

#[sqlx::test]
async fn websocket_connect_sends_snapshot(pool: PgPool) -> sqlx::Result<()> {
    let realtime_store = Arc::new(FakeRealtimeStore::default());
    let app = create_router(test_state_with_pool_and_realtime_store(
        pool,
        Arc::new(FakeTokenVerifier::new("user-1")),
        realtime_store,
    ));
    let room = create_room(&app).await;
    join_room(&app, room.room_id).await;
    let base_url = spawn_app(app).await;

    let mut request = format!("{base_url}/v1/ws/rooms/{}", room.room_id)
        .replace("http://", "ws://")
        .into_client_request()
        .expect("request should build");
    request.headers_mut().insert(
        "authorization",
        "Bearer test-token".parse().expect("header should parse"),
    );

    let (mut socket, _) = connect_async(request)
        .await
        .expect("joined member should connect");
    let snapshot = next_event(&mut socket).await;

    match snapshot {
        SnapshotEvent::Snapshot {
            room_id,
            participants,
        } => {
            assert_eq!(room_id, room.room_id);
            assert_eq!(participants.len(), 1);
            assert_eq!(participants[0].user_id, "user-1");
            assert!(participants[0].present);
            assert!(!participants[0].muted);
        }
        other => panic!("expected snapshot event, got {other:?}"),
    }

    Ok(())
}

#[sqlx::test]
async fn second_connection_receives_presence_joined_event(pool: PgPool) -> sqlx::Result<()> {
    let realtime_store = Arc::new(FakeRealtimeStore::default());
    let app = create_router(test_state_with_pool_and_realtime_store(
        pool,
        Arc::new(FakeTokenVerifier::new("user-1")),
        realtime_store,
    ));
    let room = create_room(&app).await;
    join_room(&app, room.room_id).await;
    let base_url = spawn_app(app).await;

    let mut first_socket = connect_socket(&base_url, room.room_id).await;
    let _ = next_event(&mut first_socket).await;
    let _ = next_event(&mut first_socket).await;

    let mut second_socket = connect_socket(&base_url, room.room_id).await;
    let _ = next_event(&mut second_socket).await;

    let event = next_event(&mut first_socket).await;
    assert_eq!(
        event,
        SnapshotEvent::presence_joined(room.room_id, "user-1".to_owned())
    );

    Ok(())
}

#[sqlx::test]
async fn mute_set_broadcasts_mute_updated(pool: PgPool) -> sqlx::Result<()> {
    let realtime_store = Arc::new(FakeRealtimeStore::default());
    let app = create_router(test_state_with_pool_and_realtime_store(
        pool,
        Arc::new(FakeTokenVerifier::new("user-1")),
        realtime_store,
    ));
    let room = create_room(&app).await;
    join_room(&app, room.room_id).await;
    let base_url = spawn_app(app).await;

    let mut first_socket = connect_socket(&base_url, room.room_id).await;
    let _ = next_event(&mut first_socket).await;
    let _ = next_event(&mut first_socket).await;
    let mut second_socket = connect_socket(&base_url, room.room_id).await;
    let _ = next_event(&mut second_socket).await;
    let _ = next_event(&mut second_socket).await;
    let _ = next_event(&mut first_socket).await;

    first_socket
        .send(Message::Text(
            json!({ "type": "mute.set", "muted": true })
                .to_string()
                .into(),
        ))
        .await
        .expect("mute.set should send");

    let event = next_event(&mut second_socket).await;
    assert_eq!(
        event,
        SnapshotEvent::mute_updated(room.room_id, "user-1".to_owned(), true)
    );

    Ok(())
}

async fn create_room(app: &axum::Router) -> RoomResponse {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/rooms")
                .header("authorization", "Bearer test-token")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "name": "General" }).to_string()))
                .expect("request should build"),
        )
        .await
        .expect("router should respond");
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");

    serde_json::from_slice(&body).expect("body should be valid json")
}

async fn join_room(app: &axum::Router, room_id: uuid::Uuid) {
    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/v1/rooms/{room_id}/join"))
                .header("authorization", "Bearer test-token")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");
}

async fn connect_socket(
    base_url: &str,
    room_id: uuid::Uuid,
) -> tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>> {
    let mut request = format!("{base_url}/v1/ws/rooms/{room_id}")
        .replace("http://", "ws://")
        .into_client_request()
        .expect("request should build");
    request.headers_mut().insert(
        "authorization",
        "Bearer test-token".parse().expect("header should parse"),
    );

    let (socket, _) = connect_async(request)
        .await
        .expect("joined member should connect");

    socket
}

async fn next_event(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
) -> SnapshotEvent {
    let message = socket
        .next()
        .await
        .expect("socket should yield a frame")
        .expect("frame should be readable");
    let text = message.into_text().expect("frame should be text");

    serde_json::from_str(&text).expect("event should be valid json")
}
