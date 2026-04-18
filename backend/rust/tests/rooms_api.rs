mod support;

use std::sync::Arc;

use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use backend::{
    app::router::create_router,
    features::{
        realtime::store::RealtimeStore,
        rooms::dto::{JoinRoomResponse, RoomDetailResponse, RoomResponse},
    },
};
use serde_json::json;
use sqlx::PgPool;
use tower::util::ServiceExt;

use crate::support::{
    FakeRealtimeStore, FakeTokenVerifier, test_state_with_pool,
    test_state_with_pool_and_realtime_store,
};

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

#[sqlx::test]
async fn first_join_creates_meeting_and_attendee(pool: PgPool) -> sqlx::Result<()> {
    let app = create_router(test_state_with_pool(
        pool,
        Arc::new(FakeTokenVerifier::new("user-1")),
    ));
    let room = create_room(&app).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/v1/rooms/{}/join", room.room_id))
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
    let body: JoinRoomResponse = serde_json::from_slice(&body).expect("body should be valid json");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.room_id, room.room_id);
    assert!(body.meeting_id.starts_with("meeting-"));
    assert_eq!(
        body.attendee_id,
        format!("attendee-{}-user-1", body.meeting_id)
    );

    Ok(())
}

#[sqlx::test]
async fn second_join_reuses_active_meeting(pool: PgPool) -> sqlx::Result<()> {
    let app_user_1 = create_router(test_state_with_pool(
        pool.clone(),
        Arc::new(FakeTokenVerifier::new("user-1")),
    ));
    let app_user_2 = create_router(test_state_with_pool(
        pool,
        Arc::new(FakeTokenVerifier::new("user-2")),
    ));
    let room = create_room(&app_user_1).await;
    let first_join = join_room(&app_user_1, room.room_id).await;
    let second_join = join_room(&app_user_2, room.room_id).await;

    assert_eq!(first_join.meeting_id, second_join.meeting_id);
    assert_eq!(
        first_join.external_meeting_id,
        second_join.external_meeting_id
    );
    assert_ne!(first_join.attendee_id, second_join.attendee_id);

    Ok(())
}

#[sqlx::test]
async fn last_leave_ends_meeting_and_next_join_recreates_it(pool: PgPool) -> sqlx::Result<()> {
    let app_user_1 = create_router(test_state_with_pool(
        pool.clone(),
        Arc::new(FakeTokenVerifier::new("user-1")),
    ));
    let app_user_2 = create_router(test_state_with_pool(
        pool,
        Arc::new(FakeTokenVerifier::new("user-2")),
    ));
    let room = create_room(&app_user_1).await;
    let first_join = join_room(&app_user_1, room.room_id).await;

    let leave_response = app_user_1
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/v1/rooms/{}/leave", room.room_id))
                .header("authorization", "Bearer test-token")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");

    assert_eq!(leave_response.status(), StatusCode::NO_CONTENT);

    let second_join = join_room(&app_user_2, room.room_id).await;

    assert_ne!(first_join.meeting_id, second_join.meeting_id);

    Ok(())
}

#[sqlx::test]
async fn concurrent_joins_create_only_one_active_meeting(pool: PgPool) -> sqlx::Result<()> {
    let app_user_1 = create_router(test_state_with_pool(
        pool.clone(),
        Arc::new(FakeTokenVerifier::new("user-1")),
    ));
    let app_user_2 = create_router(test_state_with_pool(
        pool.clone(),
        Arc::new(FakeTokenVerifier::new("user-2")),
    ));
    let room = create_room(&app_user_1).await;

    let first_request = Request::builder()
        .method("POST")
        .uri(format!("/v1/rooms/{}/join", room.room_id))
        .header("authorization", "Bearer test-token")
        .body(Body::empty())
        .expect("request should build");
    let second_request = Request::builder()
        .method("POST")
        .uri(format!("/v1/rooms/{}/join", room.room_id))
        .header("authorization", "Bearer test-token")
        .body(Body::empty())
        .expect("request should build");

    let (first_response, second_response) = tokio::join!(
        app_user_1.oneshot(first_request),
        app_user_2.oneshot(second_request)
    );

    assert_eq!(
        first_response.expect("router should respond").status(),
        StatusCode::OK
    );
    assert_eq!(
        second_response.expect("router should respond").status(),
        StatusCode::OK
    );

    let active_meeting_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM meetings WHERE room_id = $1 AND status = 'active'",
    )
    .bind(room.room_id)
    .fetch_one(&pool)
    .await?;

    assert_eq!(active_meeting_count, 1);

    Ok(())
}

#[sqlx::test]
async fn leave_clears_realtime_presence_and_mute_state(pool: PgPool) -> sqlx::Result<()> {
    let realtime_store = Arc::new(FakeRealtimeStore::default());
    let app = create_router(test_state_with_pool_and_realtime_store(
        pool,
        Arc::new(FakeTokenVerifier::new("user-1")),
        realtime_store.clone(),
    ));
    let room = create_room(&app).await;

    join_room(&app, room.room_id).await;
    realtime_store
        .upsert_presence(room.room_id, "user-1")
        .await
        .expect("presence should upsert");
    realtime_store
        .set_mute(room.room_id, "user-1", true)
        .await
        .expect("mute should update");

    let leave_response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/v1/rooms/{}/leave", room.room_id))
                .header("authorization", "Bearer test-token")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");

    assert_eq!(leave_response.status(), StatusCode::NO_CONTENT);

    realtime_store
        .upsert_presence(room.room_id, "user-1")
        .await
        .expect("presence should upsert after leave");

    let snapshot = realtime_store
        .snapshot(room.room_id)
        .await
        .expect("snapshot should load");

    assert_eq!(snapshot.participants.len(), 1);
    assert_eq!(snapshot.participants[0].user_id, "user-1");
    assert!(!snapshot.participants[0].muted);

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
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");

    serde_json::from_slice(&body).expect("body should be valid json")
}

async fn join_room(app: &axum::Router, room_id: uuid::Uuid) -> JoinRoomResponse {
    let response = app
        .clone()
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
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");

    serde_json::from_slice(&body).expect("body should be valid json")
}
