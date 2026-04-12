use std::{env, net::SocketAddr};

use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
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
        let database_url =
            env::var("DATABASE_URL").map_err(|_| AppError::MissingConfig("DATABASE_URL"))?;

        Ok(Self {
            host,
            port,
            database_url,
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
}
