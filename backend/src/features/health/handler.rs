use axum::{Json, extract::State};

use crate::{
    app::state::AppState,
    error::AppError,
    features::health::{dto::HealthResponse, service},
};

pub async fn health_handler() -> Json<HealthResponse> {
    Json(service::app_health())
}

pub async fn db_health_handler(
    State(state): State<AppState>,
) -> Result<Json<HealthResponse>, AppError> {
    let response = service::db_health(&state.db_pool).await?;
    Ok(Json(response))
}

#[cfg(test)]
mod tests {
    use axum::{
        Router,
        body::Body,
        http::{Request, StatusCode},
        routing::get,
    };
    use tower::util::ServiceExt;

    use super::health_handler;

    #[tokio::test]
    async fn health_handler_returns_ok() {
        let app = Router::new().route("/health", get(health_handler));
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
    }
}
