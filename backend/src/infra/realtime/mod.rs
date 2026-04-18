use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use futures_util::{StreamExt, stream};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    error::AppError,
    features::realtime::{
        dto::{ParticipantSnapshot, RoomSnapshot, ServerRealtimeEvent},
        store::{RealtimeEventStream, RealtimeStore},
    },
};

#[derive(Clone)]
pub struct RedisRealtimeStore {
    client: redis::Client,
}

impl RedisRealtimeStore {
    pub fn new(client: redis::Client) -> Self {
        Self { client }
    }

    async fn connection(&self) -> Result<redis::aio::MultiplexedConnection, AppError> {
        self.client
            .get_multiplexed_async_connection()
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))
    }

    fn presence_key(room_id: Uuid) -> String {
        format!("room:{room_id}:presence")
    }

    fn mute_key(room_id: Uuid) -> String {
        format!("room:{room_id}:mute")
    }

    fn events_channel(room_id: Uuid) -> String {
        format!("room:{room_id}:events")
    }

    fn joined_at_ms() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_millis()
    }
}

#[async_trait]
impl RealtimeStore for RedisRealtimeStore {
    async fn snapshot(&self, room_id: Uuid) -> Result<RoomSnapshot, AppError> {
        let mut conn = self.connection().await?;
        let presence: std::collections::HashMap<String, String> = conn
            .hgetall(Self::presence_key(room_id))
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;
        let mute: std::collections::HashMap<String, String> = conn
            .hgetall(Self::mute_key(room_id))
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;
        let mut participants = presence
            .into_values()
            .map(|payload| {
                let presence: PresenceEntry = serde_json::from_str(&payload)
                    .map_err(|source| AppError::Dependency(source.to_string()))?;
                let muted = mute
                    .get(&presence.user_id)
                    .is_some_and(|value| matches!(value.as_str(), "true" | "1"));

                Ok(ParticipantSnapshot {
                    user_id: presence.user_id,
                    present: true,
                    muted,
                })
            })
            .collect::<Result<Vec<_>, AppError>>()?;
        participants.sort_by(|left, right| left.user_id.cmp(&right.user_id));

        Ok(RoomSnapshot { participants })
    }

    async fn upsert_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.connection().await?;
        let payload = serde_json::to_string(&PresenceEntry {
            user_id: user_id.to_owned(),
            joined_at_ms: Self::joined_at_ms(),
        })
        .map_err(|source| AppError::Dependency(source.to_string()))?;

        let _: usize = conn
            .hset(Self::presence_key(room_id), user_id, payload)
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        Ok(())
    }

    async fn remove_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.connection().await?;
        let _: usize = conn
            .hdel(Self::presence_key(room_id), user_id)
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        Ok(())
    }

    async fn set_mute(&self, room_id: Uuid, user_id: &str, muted: bool) -> Result<(), AppError> {
        let mut conn = self.connection().await?;
        let _: usize = conn
            .hset(Self::mute_key(room_id), user_id, muted)
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        Ok(())
    }

    async fn remove_mute(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.connection().await?;
        let _: usize = conn
            .hdel(Self::mute_key(room_id), user_id)
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        Ok(())
    }

    async fn publish(&self, room_id: Uuid, event: ServerRealtimeEvent) -> Result<(), AppError> {
        let mut conn = self.connection().await?;
        let payload = serde_json::to_string(&event)
            .map_err(|source| AppError::Dependency(source.to_string()))?;
        let _: usize = conn
            .publish(Self::events_channel(room_id), payload)
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        Ok(())
    }

    async fn subscribe(&self, room_id: Uuid) -> Result<RealtimeEventStream, AppError> {
        let mut pubsub = self
            .client
            .get_async_pubsub()
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;
        pubsub
            .subscribe(Self::events_channel(room_id))
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;
        let stream = pubsub.into_on_message().map(|message| {
            let payload: String = message
                .get_payload()
                .map_err(|source| AppError::Dependency(source.to_string()))?;

            serde_json::from_str::<ServerRealtimeEvent>(&payload)
                .map_err(|source| AppError::Dependency(source.to_string()))
        });

        Ok(Box::pin(stream))
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

    async fn publish(&self, _room_id: Uuid, _event: ServerRealtimeEvent) -> Result<(), AppError> {
        Ok(())
    }

    async fn subscribe(&self, _room_id: Uuid) -> Result<RealtimeEventStream, AppError> {
        Ok(Box::pin(stream::empty()))
    }
}

pub fn default_realtime_store() -> Arc<dyn RealtimeStore> {
    Arc::new(NoopRealtimeStore)
}

#[derive(Debug, Serialize, Deserialize)]
struct PresenceEntry {
    user_id: String,
    joined_at_ms: u128,
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use crate::features::realtime::store::RealtimeStore;

    use super::RedisRealtimeStore;

    #[tokio::test]
    async fn redis_store_snapshot_reflects_presence_and_mute() {
        let client = redis::Client::open("redis://127.0.0.1:6379").expect("redis url should parse");
        let store = RedisRealtimeStore::new(client.clone());
        let room_id = Uuid::new_v4();
        let mut conn = client
            .get_multiplexed_async_connection()
            .await
            .expect("redis connection should open");
        let _: () = redis::cmd("DEL")
            .arg(format!("room:{room_id}:presence"))
            .arg(format!("room:{room_id}:mute"))
            .query_async(&mut conn)
            .await
            .expect("redis keys should be cleared");

        store
            .upsert_presence(room_id, "user-1")
            .await
            .expect("presence should be stored");
        store
            .set_mute(room_id, "user-1", true)
            .await
            .expect("mute should be stored");

        let snapshot = store.snapshot(room_id).await.expect("snapshot should load");

        assert_eq!(snapshot.participants.len(), 1);
        assert_eq!(snapshot.participants[0].user_id, "user-1");
        assert!(snapshot.participants[0].present);
        assert!(snapshot.participants[0].muted);
    }

    #[tokio::test]
    async fn redis_store_remove_presence_keeps_snapshot_empty() {
        let client = redis::Client::open("redis://127.0.0.1:6379").expect("redis url should parse");
        let store = RedisRealtimeStore::new(client.clone());
        let room_id = Uuid::new_v4();
        let mut conn = client
            .get_multiplexed_async_connection()
            .await
            .expect("redis connection should open");
        let _: () = redis::cmd("DEL")
            .arg(format!("room:{room_id}:presence"))
            .arg(format!("room:{room_id}:mute"))
            .query_async(&mut conn)
            .await
            .expect("redis keys should be cleared");

        store
            .upsert_presence(room_id, "user-1")
            .await
            .expect("presence should be stored");
        store
            .set_mute(room_id, "user-1", true)
            .await
            .expect("mute should be stored");
        store
            .remove_presence(room_id, "user-1")
            .await
            .expect("presence should be removed");

        let snapshot = store.snapshot(room_id).await.expect("snapshot should load");

        assert!(snapshot.participants.is_empty());
    }
}
