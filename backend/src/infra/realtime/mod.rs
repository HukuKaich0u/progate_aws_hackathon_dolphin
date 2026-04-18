use std::sync::Arc;

use async_trait::async_trait;
use uuid::Uuid;

use crate::{
    error::AppError,
    features::realtime::{dto::RoomSnapshot, store::RealtimeStore},
};

#[derive(Clone)]
pub struct RedisRealtimeStore {
    client: redis::Client,
}

impl RedisRealtimeStore {
    pub fn new(client: redis::Client) -> Self {
        Self { client }
    }

    pub fn client(&self) -> &redis::Client {
        &self.client
    }
}

#[async_trait]
impl RealtimeStore for RedisRealtimeStore {
    async fn snapshot(&self, _room_id: Uuid) -> Result<RoomSnapshot, AppError> {
        Ok(RoomSnapshot {
            participants: Vec::new(),
        })
    }

    async fn upsert_presence(&self, _room_id: Uuid, _user_id: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn remove_presence(&self, _room_id: Uuid, _user_id: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn set_mute(&self, _room_id: Uuid, _user_id: &str, _muted: bool) -> Result<(), AppError> {
        Ok(())
    }

    async fn remove_mute(&self, _room_id: Uuid, _user_id: &str) -> Result<(), AppError> {
        Ok(())
    }
}

pub fn redis_realtime_store(client: redis::Client) -> Arc<dyn RealtimeStore> {
    Arc::new(RedisRealtimeStore::new(client))
}

#[derive(Clone, Default)]
pub struct NoopRealtimeStore;

#[async_trait]
impl RealtimeStore for NoopRealtimeStore {
    async fn snapshot(&self, _room_id: Uuid) -> Result<RoomSnapshot, AppError> {
        Ok(RoomSnapshot {
            participants: Vec::new(),
        })
    }

    async fn upsert_presence(&self, _room_id: Uuid, _user_id: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn remove_presence(&self, _room_id: Uuid, _user_id: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn set_mute(&self, _room_id: Uuid, _user_id: &str, _muted: bool) -> Result<(), AppError> {
        Ok(())
    }

    async fn remove_mute(&self, _room_id: Uuid, _user_id: &str) -> Result<(), AppError> {
        Ok(())
    }
}

pub fn default_realtime_store() -> Arc<dyn RealtimeStore> {
    Arc::new(NoopRealtimeStore)
}
