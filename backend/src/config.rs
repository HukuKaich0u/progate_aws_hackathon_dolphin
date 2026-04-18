use std::{env, net::SocketAddr};

use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub aws_region: String,
    pub chime_media_region: String,
    pub cognito_user_pool_id: String,
    pub cognito_client_id: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, AppError> {
        let host = env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".to_owned());
        let port = env::var("APP_PORT")
            .unwrap_or_else(|_| "3000".to_owned())
            .parse()
            .map_err(|source| AppError::InvalidConfig {
                key: "APP_PORT",
                source,
            })?;
        let database_url = required_var("DATABASE_URL")?;
        let redis_url = required_var("REDIS_URL")?;
        let aws_region = required_var("AWS_REGION")?;
        let chime_media_region = required_var("CHIME_MEDIA_REGION")?;
        let cognito_user_pool_id = required_var("COGNITO_USER_POOL_ID")?;
        let cognito_client_id = required_var("COGNITO_CLIENT_ID")?;

        Ok(Self {
            host,
            port,
            database_url,
            redis_url,
            aws_region,
            chime_media_region,
            cognito_user_pool_id,
            cognito_client_id,
        })
    }

    pub fn socket_addr(&self) -> Result<SocketAddr, AppError> {
        format!("{}:{}", self.host, self.port)
            .parse()
            .map_err(|source| AppError::InvalidSocketAddress {
                value: format!("{}:{}", self.host, self.port),
                source,
            })
    }

    pub fn cognito_issuer(&self) -> String {
        format!(
            "https://cognito-idp.{}.amazonaws.com/{}",
            self.aws_region, self.cognito_user_pool_id
        )
    }

    pub fn cognito_jwks_url(&self) -> String {
        format!("{}/.well-known/jwks.json", self.cognito_issuer())
    }
}

fn required_var(key: &'static str) -> Result<String, AppError> {
    env::var(key).map_err(|_| AppError::MissingConfig(key))
}

#[cfg(test)]
mod tests {
    use super::AppConfig;
    use crate::error::AppError;

    #[test]
    fn from_env_requires_aws_and_cognito_settings() {
        temp_env::with_vars(
            [
                ("APP_HOST", Some("127.0.0.1")),
                ("APP_PORT", Some("4000")),
                (
                    "DATABASE_URL",
                    Some("postgres://postgres:postgres@localhost:5432/app"),
                ),
                ("REDIS_URL", Some("redis://127.0.0.1:6379")),
                ("AWS_REGION", None),
                ("CHIME_MEDIA_REGION", Some("ap-northeast-1")),
                ("COGNITO_USER_POOL_ID", Some("ap-northeast-1_pool")),
                ("COGNITO_CLIENT_ID", Some("client-id")),
            ],
            || {
                let error = AppConfig::from_env().expect_err("missing AWS_REGION should fail");

                assert!(matches!(error, AppError::MissingConfig("AWS_REGION")));
            },
        );
    }

    #[test]
    fn from_env_requires_redis_url() {
        temp_env::with_vars(
            [
                ("APP_HOST", Some("127.0.0.1")),
                ("APP_PORT", Some("4000")),
                (
                    "DATABASE_URL",
                    Some("postgres://postgres:postgres@localhost:5432/app"),
                ),
                ("REDIS_URL", Some("redis://127.0.0.1:6379")),
                ("AWS_REGION", Some("ap-northeast-1")),
                ("CHIME_MEDIA_REGION", Some("ap-northeast-1")),
                ("COGNITO_USER_POOL_ID", Some("ap-northeast-1_pool")),
                ("COGNITO_CLIENT_ID", Some("client-id")),
                ("REDIS_URL", None),
            ],
            || {
                let error = AppConfig::from_env().expect_err("missing REDIS_URL should fail");

                assert!(matches!(error, AppError::MissingConfig("REDIS_URL")));
            },
        );
    }

    #[test]
    fn from_env_debug_includes_aws_and_cognito_settings() {
        temp_env::with_vars(
            [
                ("APP_HOST", Some("127.0.0.1")),
                ("APP_PORT", Some("4000")),
                (
                    "DATABASE_URL",
                    Some("postgres://postgres:postgres@localhost:5432/app"),
                ),
                ("REDIS_URL", Some("redis://127.0.0.1:6379")),
                ("AWS_REGION", Some("ap-northeast-1")),
                ("CHIME_MEDIA_REGION", Some("ap-northeast-1")),
                ("COGNITO_USER_POOL_ID", Some("ap-northeast-1_pool")),
                ("COGNITO_CLIENT_ID", Some("client-id")),
            ],
            || {
                let config = AppConfig::from_env().expect("config should load");
                let debug_output = format!("{config:?}");

                assert!(debug_output.contains("aws_region"));
                assert!(debug_output.contains("ap-northeast-1_pool"));
                assert!(debug_output.contains("client-id"));
            },
        );
    }

    #[test]
    fn cognito_endpoints_are_derived_from_region_and_pool_id() {
        let config = AppConfig {
            host: "0.0.0.0".to_owned(),
            port: 3000,
            database_url: "postgres://postgres:postgres@localhost:5432/app".to_owned(),
            redis_url: "redis://127.0.0.1:6379".to_owned(),
            aws_region: "ap-northeast-1".to_owned(),
            chime_media_region: "ap-northeast-1".to_owned(),
            cognito_user_pool_id: "ap-northeast-1_example".to_owned(),
            cognito_client_id: "client-id".to_owned(),
        };

        assert_eq!(
            config.cognito_issuer(),
            "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_example"
        );
        assert_eq!(
            config.cognito_jwks_url(),
            "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_example/.well-known/jwks.json"
        );
    }
}
