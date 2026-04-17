use std::sync::Arc;

use async_trait::async_trait;

use crate::{
    error::AppError,
    features::auth::{context::AuthenticatedUser, verifier::TokenVerifier},
};

#[derive(Clone, Default)]
pub struct RejectAllTokenVerifier;

#[async_trait]
impl TokenVerifier for RejectAllTokenVerifier {
    async fn verify(&self, _bearer: &str) -> Result<AuthenticatedUser, AppError> {
        Err(AppError::Unauthorized)
    }
}

pub fn default_token_verifier() -> Arc<dyn TokenVerifier> {
    Arc::new(RejectAllTokenVerifier)
}
