use axum::{Router, routing::get};

use crate::{
    app::state::AppState,
    features::health::handler::{db_health_handler, health_handler},
};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/health/db", get(db_health_handler))
        .with_state(state)
}
