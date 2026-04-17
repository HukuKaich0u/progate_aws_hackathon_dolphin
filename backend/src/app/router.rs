use axum::{Router, routing::get};

use crate::{
    app::{request_id::apply_request_id, state::AppState},
    features::health::handler::{db_health_handler, health_handler},
};

pub fn create_router(state: AppState) -> Router {
    apply_request_id(
        Router::new()
            .route("/health", get(health_handler))
            .route("/health/db", get(db_health_handler))
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
    use crate::{app::state::AppState, config::AppConfig};

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
        };
        let db_pool = PgPoolOptions::new()
            .connect_lazy(&config.database_url)
            .expect("pool config should be valid");

        AppState { config, db_pool }
    }
}
