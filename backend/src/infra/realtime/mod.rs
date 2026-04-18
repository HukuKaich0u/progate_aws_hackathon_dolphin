use std::sync::Arc;

use crate::features::realtime::store::RealtimeStore;

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

impl RealtimeStore for RedisRealtimeStore {}

pub fn redis_realtime_store(client: redis::Client) -> Arc<dyn RealtimeStore> {
    Arc::new(RedisRealtimeStore::new(client))
}

#[derive(Clone, Default)]
pub struct NoopRealtimeStore;

impl RealtimeStore for NoopRealtimeStore {}

pub fn default_realtime_store() -> Arc<dyn RealtimeStore> {
    Arc::new(NoopRealtimeStore)
}
