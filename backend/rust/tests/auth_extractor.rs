mod support;

use std::sync::Arc;

use axum::{
    Json, Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
    routing::get,
};
use serde::Serialize;
use tower::util::ServiceExt;

use backend::features::auth::context::AuthenticatedUser;

use crate::support::{FakeTokenVerifier, test_state};

#[derive(Serialize)]
struct MeResponse {
    user_id: String,
}

#[tokio::test]
async fn protected_route_rejects_missing_bearer_token() {
    let app = Router::new()
        .route("/me", get(me_handler))
        .with_state(test_state(Arc::new(FakeTokenVerifier::new("user-123"))));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/me")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn protected_route_exposes_authenticated_user_from_fake_verifier() {
    let app = Router::new()
        .route("/me", get(me_handler))
        .with_state(test_state(Arc::new(FakeTokenVerifier::new("user-123"))));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/me")
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
    let body = String::from_utf8(body.to_vec()).expect("body should be utf8");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, r#"{"user_id":"user-123"}"#);
}

async fn me_handler(user: AuthenticatedUser) -> Json<MeResponse> {
    Json(MeResponse {
        user_id: user.user_id,
    })
}
