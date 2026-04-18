use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use futures_util::stream;
use sqlx::postgres::PgPoolOptions;
use tokio::{net::TcpListener, sync::broadcast};
use uuid::Uuid;

use backend::{
    app::state::AppState,
    config::AppConfig,
    error::AppError,
    features::{
        auth::{context::AuthenticatedUser, verifier::TokenVerifier},
        realtime::{
            dto::{ParticipantSnapshot, RoomSnapshot, ServerRealtimeEvent},
            store::{RealtimeEventStream, RealtimeStore},
        },
    },
    infra::{
        chime::{MeetingProvider, ProvisionedAttendee, ProvisionedMeeting},
        realtime::default_realtime_store,
    },
};

#[derive(Clone)]
pub struct FakeTokenVerifier {
    user: AuthenticatedUser,
}

impl FakeTokenVerifier {
    pub fn new(user_id: &str) -> Self {
        Self {
            user: AuthenticatedUser {
                user_id: user_id.to_owned(),
            },
        }
    }
}

#[async_trait]
impl TokenVerifier for FakeTokenVerifier {
    async fn verify(&self, _bearer: &str) -> Result<AuthenticatedUser, AppError> {
        Ok(self.user.clone())
    }
}

#[derive(Clone, Default)]
pub struct FakeMeetingProvider;

#[async_trait]
impl MeetingProvider for FakeMeetingProvider {
    async fn create_meeting(
        &self,
        _room_id: Uuid,
        meeting_id: Uuid,
    ) -> Result<ProvisionedMeeting, AppError> {
        Ok(ProvisionedMeeting {
            meeting_id: format!("meeting-{meeting_id}"),
            external_meeting_id: format!("external-{meeting_id}"),
        })
    }

    async fn create_attendee(
        &self,
        meeting_id: &str,
        user_id: &str,
    ) -> Result<ProvisionedAttendee, AppError> {
        Ok(ProvisionedAttendee {
            attendee_id: format!("attendee-{meeting_id}-{user_id}"),
            join_token: format!("token-{user_id}"),
        })
    }

    async fn delete_meeting(&self, _meeting_id: &str) -> Result<(), AppError> {
        Ok(())
    }
}

#[allow(dead_code)]
pub fn test_state(token_verifier: Arc<dyn TokenVerifier>) -> AppState {
    let config = AppConfig {
        host: "127.0.0.1".to_owned(),
        port: 3000,
        database_url: "postgres://postgres:postgres@localhost:5432/app".to_owned(),
        aws_region: "ap-northeast-1".to_owned(),
        chime_media_region: "ap-northeast-1".to_owned(),
        cognito_user_pool_id: "ap-northeast-1_pool".to_owned(),
        cognito_client_id: "client-id".to_owned(),
        redis_url: "redis://127.0.0.1:6379".to_owned(),
    };
    let db_pool = PgPoolOptions::new()
        .connect_lazy(&config.database_url)
        .expect("pool config should be valid");

    test_state_with_pool(db_pool, token_verifier)
}

pub fn test_state_with_pool(
    pool: sqlx::PgPool,
    token_verifier: Arc<dyn TokenVerifier>,
) -> AppState {
    test_state_with_pool_and_realtime_store(pool, token_verifier, default_realtime_store())
}

pub fn test_state_with_pool_and_realtime_store(
    pool: sqlx::PgPool,
    token_verifier: Arc<dyn TokenVerifier>,
    realtime_store: Arc<dyn RealtimeStore>,
) -> AppState {
    let config = AppConfig {
        host: "127.0.0.1".to_owned(),
        port: 3000,
        database_url: "postgres://postgres:postgres@127.0.0.1:5432/postgres".to_owned(),
        aws_region: "ap-northeast-1".to_owned(),
        chime_media_region: "ap-northeast-1".to_owned(),
        cognito_user_pool_id: "ap-northeast-1_pool".to_owned(),
        cognito_client_id: "client-id".to_owned(),
        redis_url: "redis://127.0.0.1:6379".to_owned(),
    };

    AppState {
        config,
        db_pool: pool,
        token_verifier,
        meeting_provider: Arc::new(FakeMeetingProvider),
        realtime_store,
    }
}

#[allow(dead_code)]
#[derive(Clone, Default)]
pub struct FakeRealtimeStore {
    rooms: Arc<Mutex<HashMap<Uuid, HashMap<String, bool>>>>,
    channels: Arc<Mutex<HashMap<Uuid, broadcast::Sender<ServerRealtimeEvent>>>>,
}

#[async_trait]
impl RealtimeStore for FakeRealtimeStore {
    async fn snapshot(&self, room_id: Uuid) -> Result<RoomSnapshot, AppError> {
        let rooms = self
            .rooms
            .lock()
            .expect("fake realtime store lock should not be poisoned");
        let participants = rooms
            .get(&room_id)
            .into_iter()
            .flat_map(|room| room.iter())
            .map(|(user_id, muted)| ParticipantSnapshot {
                user_id: user_id.clone(),
                present: true,
                muted: *muted,
            })
            .collect();

        Ok(RoomSnapshot { participants })
    }

    async fn upsert_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError> {
        let mut rooms = self
            .rooms
            .lock()
            .expect("fake realtime store lock should not be poisoned");
        rooms
            .entry(room_id)
            .or_default()
            .entry(user_id.to_owned())
            .or_insert(false);

        Ok(())
    }

    async fn remove_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError> {
        let mut rooms = self
            .rooms
            .lock()
            .expect("fake realtime store lock should not be poisoned");
        if let Some(room) = rooms.get_mut(&room_id) {
            room.remove(user_id);
            if room.is_empty() {
                rooms.remove(&room_id);
            }
        }

        Ok(())
    }

    async fn set_mute(&self, room_id: Uuid, user_id: &str, muted: bool) -> Result<(), AppError> {
        let mut rooms = self
            .rooms
            .lock()
            .expect("fake realtime store lock should not be poisoned");
        rooms
            .entry(room_id)
            .or_default()
            .insert(user_id.to_owned(), muted);

        Ok(())
    }

    async fn remove_mute(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError> {
        let mut rooms = self
            .rooms
            .lock()
            .expect("fake realtime store lock should not be poisoned");
        if let Some(room) = rooms.get_mut(&room_id)
            && let Some(muted) = room.get_mut(user_id)
        {
            *muted = false;
        }

        Ok(())
    }

    async fn publish(&self, room_id: Uuid, event: ServerRealtimeEvent) -> Result<(), AppError> {
        let sender = self.channel(room_id);
        let _ = sender.send(event);

        Ok(())
    }

    async fn subscribe(&self, room_id: Uuid) -> Result<RealtimeEventStream, AppError> {
        let receiver = self.channel(room_id).subscribe();
        let stream = stream::unfold(receiver, |mut receiver| async move {
            match receiver.recv().await {
                Ok(event) => Some((Ok(event), receiver)),
                Err(broadcast::error::RecvError::Closed) => None,
                Err(broadcast::error::RecvError::Lagged(_)) => Some((
                    Err(AppError::Dependency("realtime event lagged".to_owned())),
                    receiver,
                )),
            }
        });

        Ok(Box::pin(stream))
    }
}

impl FakeRealtimeStore {
    #[allow(dead_code)]
    fn channel(&self, room_id: Uuid) -> broadcast::Sender<ServerRealtimeEvent> {
        let mut channels = self
            .channels
            .lock()
            .expect("fake realtime channel lock should not be poisoned");

        channels
            .entry(room_id)
            .or_insert_with(|| broadcast::channel(32).0)
            .clone()
    }
}

#[allow(dead_code)]
pub async fn spawn_app(app: axum::Router) -> String {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener should bind");
    let address = listener
        .local_addr()
        .expect("listener should expose local addr");

    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("server should serve test app");
    });

    format!("http://{address}")
}
