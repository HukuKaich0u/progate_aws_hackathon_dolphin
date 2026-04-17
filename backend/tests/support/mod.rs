use std::sync::Arc;

use async_trait::async_trait;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

use backend::{
    app::state::AppState,
    config::AppConfig,
    error::AppError,
    features::auth::{context::AuthenticatedUser, verifier::TokenVerifier},
    infra::chime::{MeetingProvider, ProvisionedAttendee, ProvisionedMeeting},
};

#[derive(Clone)]
pub struct FakeTokenVerifier {
    user: AuthenticatedUser,
}

impl FakeTokenVerifier {
    pub fn new(user_id: &str) -> Self {
        Self {
            user: AuthenticatedUser {
                user_id: user_id.to_owned(),
            },
        }
    }
}

#[async_trait]
impl TokenVerifier for FakeTokenVerifier {
    async fn verify(&self, _bearer: &str) -> Result<AuthenticatedUser, AppError> {
        Ok(self.user.clone())
    }
}

#[derive(Clone, Default)]
pub struct FakeMeetingProvider;

#[async_trait]
impl MeetingProvider for FakeMeetingProvider {
    async fn create_meeting(
        &self,
        _room_id: Uuid,
        _meeting_id: Uuid,
    ) -> Result<ProvisionedMeeting, AppError> {
        Ok(ProvisionedMeeting {
            meeting_id: "meeting-1".to_owned(),
            external_meeting_id: "external-1".to_owned(),
        })
    }

    async fn create_attendee(
        &self,
        _meeting_id: &str,
        _user_id: &str,
    ) -> Result<ProvisionedAttendee, AppError> {
        Ok(ProvisionedAttendee {
            attendee_id: "attendee-1".to_owned(),
            join_token: "token-1".to_owned(),
        })
    }

    async fn delete_meeting(&self, _meeting_id: &str) -> Result<(), AppError> {
        Ok(())
    }
}

#[allow(dead_code)]
pub fn test_state(token_verifier: Arc<dyn TokenVerifier>) -> AppState {
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

    test_state_with_pool(db_pool, token_verifier)
}

pub fn test_state_with_pool(
    pool: sqlx::PgPool,
    token_verifier: Arc<dyn TokenVerifier>,
) -> AppState {
    let config = AppConfig {
        host: "127.0.0.1".to_owned(),
        port: 3000,
        database_url: "postgres://postgres:postgres@127.0.0.1:5432/postgres".to_owned(),
        aws_region: "ap-northeast-1".to_owned(),
        chime_media_region: "ap-northeast-1".to_owned(),
        cognito_user_pool_id: "ap-northeast-1_pool".to_owned(),
        cognito_client_id: "client-id".to_owned(),
    };

    AppState {
        config,
        db_pool: pool,
        token_verifier,
        meeting_provider: Arc::new(FakeMeetingProvider),
    }
}
