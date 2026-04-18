use std::sync::Arc;

use sqlx::PgPool;

use crate::{
    config::AppConfig, features::auth::verifier::TokenVerifier, infra::chime::MeetingProvider,
};

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub db_pool: PgPool,
    pub token_verifier: Arc<dyn TokenVerifier>,
    pub meeting_provider: Arc<dyn MeetingProvider>,
}
