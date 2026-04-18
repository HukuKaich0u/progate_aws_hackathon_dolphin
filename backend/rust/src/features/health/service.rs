use sqlx::PgPool;

use crate::{error::AppError, features::health::dto::HealthResponse};

pub fn app_health() -> HealthResponse {
    HealthResponse { status: "ok" }
}

pub async fn db_health(pool: &PgPool) -> Result<HealthResponse, AppError> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await?;

    Ok(HealthResponse { status: "ok" })
}

#[cfg(test)]
mod tests {
    use super::app_health;

    #[test]
    fn app_health_returns_ok_status() {
        assert_eq!(app_health().status, "ok");
    }
}
