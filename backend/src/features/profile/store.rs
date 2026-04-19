use async_trait::async_trait;

use crate::error::AppError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpsertProfileRecord {
    pub user_id: String,
    pub hair_color: String,
    pub hair_style: String,
    pub glasses: String,
    pub top_color: String,
    pub bottom_style: String,
    pub height_range: String,
    pub gender_expression: String,
}

#[derive(Clone, Debug, PartialEq, Eq, sqlx::FromRow)]
pub struct ProfileRecord {
    pub user_id: String,
    pub hair_color: String,
    pub hair_style: String,
    pub glasses: String,
    pub top_color: String,
    pub bottom_style: String,
    pub height_range: String,
    pub gender_expression: String,
}

#[async_trait]
pub trait ProfileStore: Send + Sync {
    async fn get_profile(&self, user_id: &str) -> Result<Option<ProfileRecord>, AppError>;
    async fn list_profiles(&self) -> Result<Vec<ProfileRecord>, AppError>;
    async fn upsert_profile(&self, input: UpsertProfileRecord) -> Result<ProfileRecord, AppError>;
}
