mod support;

use std::sync::Arc;

use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use backend::{
    app::router::create_router,
    features::rooms::dto::{RoomDetailResponse, RoomResponse},
};
use serde_json::json;
use sqlx::PgPool;
use tower::util::ServiceExt;

use crate::support::{FakeTokenVerifier, test_state_with_pool};

#[sqlx::test]
async fn create_room_returns_201_and_uuid(pool: PgPool) -> sqlx::Result<()> {
    let app = create_router(test_state_with_pool(
        pool,
        Arc::new(FakeTokenVerifier::new("user-123")),
    ));

    let response = app
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
    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let body: RoomResponse = serde_json::from_slice(&body).expect("body should be valid json");

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body.name, "General");

    Ok(())
}

#[sqlx::test]
async fn get_room_returns_active_meeting_false_for_new_room(pool: PgPool) -> sqlx::Result<()> {
    let app = create_router(test_state_with_pool(
        pool,
        Arc::new(FakeTokenVerifier::new("user-123")),
    ));

    let create_response = app
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
    let create_body = to_bytes(create_response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let created: RoomResponse =
        serde_json::from_slice(&create_body).expect("body should be valid json");

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/v1/rooms/{}", created.room_id))
                .header("authorization", "Bearer test-token")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");
    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let body: RoomDetailResponse =
        serde_json::from_slice(&body).expect("body should be valid json");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.room_id, created.room_id);
    assert!(!body.has_active_meeting);

    Ok(())
}
