use async_trait::async_trait;
use uuid::Uuid;

use crate::{error::AppError, features::realtime::dto::RoomSnapshot};

#[async_trait]
pub trait RealtimeStore: Send + Sync {
    async fn snapshot(&self, room_id: Uuid) -> Result<RoomSnapshot, AppError>;
    async fn upsert_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn remove_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn set_mute(&self, room_id: Uuid, user_id: &str, muted: bool) -> Result<(), AppError>;
    async fn remove_mute(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
}
