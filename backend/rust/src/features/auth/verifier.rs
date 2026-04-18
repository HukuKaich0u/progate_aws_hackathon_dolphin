use async_trait::async_trait;

use crate::{error::AppError, features::auth::context::AuthenticatedUser};

#[async_trait]
pub trait TokenVerifier: Send + Sync {
    async fn verify(&self, bearer: &str) -> Result<AuthenticatedUser, AppError>;
}
