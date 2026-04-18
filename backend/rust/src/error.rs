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
    #[error("unauthorized")]
    Unauthorized,
    #[error("bad request")]
    BadRequest(&'static str),
    #[error("not found")]
    NotFound,
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("dependency error: {0}")]
    Dependency(String),
    #[error("aws sdk error: {0}")]
    AwsSdk(String),
    #[error("server io error: {0}")]
    ServerIo(#[from] std::io::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error) = match self {
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            Self::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad_request"),
            Self::NotFound => (StatusCode::NOT_FOUND, "not_found"),
            Self::MissingConfig(_)
            | Self::InvalidConfig { .. }
            | Self::InvalidSocketAddress { .. }
            | Self::Database(_)
            | Self::Dependency(_)
            | Self::AwsSdk(_)
            | Self::ServerIo(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_server_error"),
        };

        let body = Json(ErrorResponse { error });

        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use axum::{body::to_bytes, http::StatusCode, response::IntoResponse};

    use super::AppError;

    #[tokio::test]
    async fn internal_errors_do_not_leak_raw_messages() {
        let response =
            AppError::Database(sqlx::Error::Protocol("sensitive-db-detail".into())).into_response();
        let status = response.status();
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body should be readable");
        let body = String::from_utf8(body.to_vec()).expect("body should be utf8");

        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(body, r#"{"error":"internal_server_error"}"#);
    }
}
