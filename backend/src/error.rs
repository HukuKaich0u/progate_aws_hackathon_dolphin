use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("missing required configuration: {0}")]
    MissingConfig(&'static str),
    #[error("invalid configuration for {key}: {source}")]
    InvalidConfig {
        key: &'static str,
        #[source]
        source: std::num::ParseIntError,
    },
    #[error("invalid socket address {value}: {source}")]
    InvalidSocketAddress {
        value: String,
        #[source]
        source: std::net::AddrParseError,
    },
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            Self::MissingConfig(_)
            | Self::InvalidConfig { .. }
            | Self::InvalidSocketAddress { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let body = Json(ErrorResponse {
            error: self.to_string(),
        });

        (status, body).into_response()
    }
}
