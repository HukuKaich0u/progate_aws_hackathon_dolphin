use axum::{
    Router,
    http::{HeaderValue, Method, header},
    routing::{get, post},
};
use tower_http::cors::CorsLayer;

use crate::{
    app::{request_id::apply_request_id, state::AppState},
    features::{
        auth::handler::get_current_user_handler,
        health::handler::{db_health_handler, health_handler},
        profile::handler::{
            get_my_profile_handler, list_profiles_handler, upsert_my_profile_handler,
        },
        realtime::handler::websocket_room_handler,
        rooms::handler::{
            create_room_handler, get_room_handler, join_room_handler, leave_room_handler,
        },
    },
};

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:5173".parse::<HeaderValue>().unwrap(),
            "http://localhost:5174".parse::<HeaderValue>().unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);

    apply_request_id(
        Router::new()
            .route("/health", get(health_handler))
            .route("/health/db", get(db_health_handler))
            .route("/v1/auth/me", get(get_current_user_handler))
            .route("/v1/profiles", get(list_profiles_handler))
            .route(
                "/v1/me/profile",
                get(get_my_profile_handler).put(upsert_my_profile_handler),
            )
            .route("/v1/rooms", post(create_room_handler))
            .route("/v1/rooms/{room_id}", get(get_room_handler))
            .route("/v1/rooms/{room_id}/join", post(join_room_handler))
            .route("/v1/rooms/{room_id}/leave", post(leave_room_handler))
            .route("/v1/ws/rooms/{room_id}", get(websocket_room_handler))
            .layer(cors)
            .with_state(state),
    )
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use sqlx::postgres::PgPoolOptions;
    use tower::util::ServiceExt;

    use super::create_router;
    use crate::{
        app::state::AppState,
        config::AppConfig,
        infra::{
            auth::default_token_verifier, chime::default_meeting_provider,
            realtime::default_realtime_store,
        },
    };

    #[tokio::test]
    async fn router_sets_x_request_id_header() {
        let app = create_router(test_state());
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("router should respond");

        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.headers().contains_key("x-request-id"));
    }

    fn test_state() -> AppState {
        let config = AppConfig {
            host: "127.0.0.1".to_owned(),
            port: 3000,
            database_url: "postgres://postgres:postgres@localhost:5432/app".to_owned(),
            aws_region: "ap-northeast-1".to_owned(),
            chime_media_region: "ap-northeast-1".to_owned(),
            cognito_user_pool_id: "ap-northeast-1_pool".to_owned(),
            cognito_client_id: "client-id".to_owned(),
            redis_url: "redis://127.0.0.1:6379".to_owned(),
        };
        let db_pool = PgPoolOptions::new()
            .connect_lazy(&config.database_url)
            .expect("pool config should be valid");

        AppState {
            config,
            db_pool,
            token_verifier: default_token_verifier(),
            meeting_provider: default_meeting_provider(),
            realtime_store: default_realtime_store(),
        }
    }
}
