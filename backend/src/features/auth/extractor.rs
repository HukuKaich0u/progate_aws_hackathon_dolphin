use axum::{
    extract::FromRequestParts,
    http::{
        header::{AUTHORIZATION, HeaderValue},
        request::Parts,
    },
};

use crate::{app::state::AppState, error::AppError, features::auth::context::AuthenticatedUser};

impl FromRequestParts<AppState> for AuthenticatedUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let authorization = parts
            .headers
            .get(AUTHORIZATION)
            .ok_or(AppError::Unauthorized)?;
        let bearer = parse_bearer_token(authorization)?;

        state.token_verifier.verify(bearer).await
    }
}

fn parse_bearer_token(header: &HeaderValue) -> Result<&str, AppError> {
    let header = header.to_str().map_err(|_| AppError::Unauthorized)?;

    header
        .strip_prefix("Bearer ")
        .filter(|bearer| !bearer.is_empty())
        .ok_or(AppError::Unauthorized)
}
