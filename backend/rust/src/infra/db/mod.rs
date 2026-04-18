use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::error::AppError;

pub mod rooms_store;

pub async fn create_pool(database_url: &str) -> Result<PgPool, AppError> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    Ok(pool)
}
