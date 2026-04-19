use async_trait::async_trait;
use sqlx::PgPool;

use crate::{
    error::AppError,
    features::profile::store::{ProfileRecord, ProfileStore, UpsertProfileRecord},
};

#[derive(Clone)]
pub struct SqlxProfileStore {
    pool: PgPool,
}

impl SqlxProfileStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ProfileStore for SqlxProfileStore {
    async fn list_profiles(&self) -> Result<Vec<ProfileRecord>, AppError> {
        let records = sqlx::query_as::<_, ProfileRecord>(
            r#"
            SELECT user_id, hair_color, hair_style, glasses, top_color, bottom_style,
                   height_range, gender_expression
            FROM user_profiles
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(records)
    }

    async fn get_profile(&self, user_id: &str) -> Result<Option<ProfileRecord>, AppError> {
        let record = sqlx::query_as::<_, ProfileRecord>(
            r#"
            SELECT user_id, hair_color, hair_style, glasses, top_color, bottom_style,
                   height_range, gender_expression
            FROM user_profiles
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    async fn upsert_profile(&self, input: UpsertProfileRecord) -> Result<ProfileRecord, AppError> {
        let record = sqlx::query_as::<_, ProfileRecord>(
            r#"
            INSERT INTO user_profiles (
                user_id, hair_color, hair_style, glasses, top_color,
                bottom_style, height_range, gender_expression
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) DO UPDATE SET
                hair_color = EXCLUDED.hair_color,
                hair_style = EXCLUDED.hair_style,
                glasses = EXCLUDED.glasses,
                top_color = EXCLUDED.top_color,
                bottom_style = EXCLUDED.bottom_style,
                height_range = EXCLUDED.height_range,
                gender_expression = EXCLUDED.gender_expression,
                updated_at = NOW()
            RETURNING user_id, hair_color, hair_style, glasses, top_color,
                      bottom_style, height_range, gender_expression
            "#,
        )
        .bind(input.user_id)
        .bind(input.hair_color)
        .bind(input.hair_style)
        .bind(input.glasses)
        .bind(input.top_color)
        .bind(input.bottom_style)
        .bind(input.height_range)
        .bind(input.gender_expression)
        .fetch_one(&self.pool)
        .await?;

        Ok(record)
    }
}

#[cfg(test)]
mod tests {
    use sqlx::PgPool;

    use crate::features::profile::store::{ProfileStore, UpsertProfileRecord};

    use super::SqlxProfileStore;

    fn sample_input(user_id: &str) -> UpsertProfileRecord {
        UpsertProfileRecord {
            user_id: user_id.to_owned(),
            hair_color: "brown".to_owned(),
            hair_style: "medium".to_owned(),
            glasses: "glasses".to_owned(),
            top_color: "white".to_owned(),
            bottom_style: "pants".to_owned(),
            height_range: "165_175".to_owned(),
            gender_expression: "feminine".to_owned(),
        }
    }

    #[sqlx::test(migrations = "./migrations")]
    async fn upsert_inserts_then_updates(pool: PgPool) -> sqlx::Result<()> {
        let store = SqlxProfileStore::new(pool);

        let first = store
            .upsert_profile(sample_input("user-1"))
            .await
            .expect("first upsert should insert");
        assert_eq!(first.hair_color, "brown");

        let mut next = sample_input("user-1");
        next.hair_color = "blonde".to_owned();
        let second = store
            .upsert_profile(next)
            .await
            .expect("second upsert should update");
        assert_eq!(second.hair_color, "blonde");

        let loaded = store
            .get_profile("user-1")
            .await
            .expect("profile lookup should succeed");
        assert_eq!(loaded.map(|record| record.hair_color), Some("blonde".to_owned()));

        Ok(())
    }

    #[sqlx::test(migrations = "./migrations")]
    async fn get_returns_none_for_unknown_user(pool: PgPool) -> sqlx::Result<()> {
        let store = SqlxProfileStore::new(pool);
        let result = store.get_profile("missing").await.expect("lookup should succeed");
        assert!(result.is_none());
        Ok(())
    }
}
