use std::pin::Pin;

use async_trait::async_trait;
use futures_util::Stream;
use uuid::Uuid;

use crate::{
    error::AppError,
    features::realtime::dto::{RoomSnapshot, ServerRealtimeEvent},
};

pub type RealtimeEventStream =
    Pin<Box<dyn Stream<Item = Result<ServerRealtimeEvent, AppError>> + Send>>;

#[async_trait]
pub trait RealtimeStore: Send + Sync {
    async fn snapshot(&self, room_id: Uuid) -> Result<RoomSnapshot, AppError>;
    async fn upsert_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn remove_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn set_mute(&self, room_id: Uuid, user_id: &str, muted: bool) -> Result<(), AppError>;
    async fn remove_mute(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn publish(&self, room_id: Uuid, event: ServerRealtimeEvent) -> Result<(), AppError>;
    async fn subscribe(&self, room_id: Uuid) -> Result<RealtimeEventStream, AppError>;
}
