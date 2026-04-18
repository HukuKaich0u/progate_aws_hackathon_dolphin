use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParticipantSnapshot {
    pub user_id: String,
    pub present: bool,
    pub muted: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoomSnapshot {
    pub participants: Vec<ParticipantSnapshot>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientRealtimeEvent {
    #[serde(rename = "mute.set")]
    MuteSet { muted: bool },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerRealtimeEvent {
    #[serde(rename = "snapshot")]
    Snapshot {
        room_id: Uuid,
        participants: Vec<ParticipantSnapshot>,
    },
    #[serde(rename = "presence.joined")]
    PresenceJoined { room_id: Uuid, user_id: String },
    #[serde(rename = "presence.left")]
    PresenceLeft { room_id: Uuid, user_id: String },
    #[serde(rename = "mute.updated")]
    MuteUpdated {
        room_id: Uuid,
        user_id: String,
        muted: bool,
    },
    #[serde(rename = "error")]
    Error { code: String },
}

impl ServerRealtimeEvent {
    pub fn snapshot(room_id: Uuid, participants: Vec<ParticipantSnapshot>) -> Self {
        Self::Snapshot {
            room_id,
            participants,
        }
    }

    pub fn presence_joined(room_id: Uuid, user_id: String) -> Self {
        Self::PresenceJoined { room_id, user_id }
    }

    pub fn presence_left(room_id: Uuid, user_id: String) -> Self {
        Self::PresenceLeft { room_id, user_id }
    }

    pub fn mute_updated(room_id: Uuid, user_id: String, muted: bool) -> Self {
        Self::MuteUpdated {
            room_id,
            user_id,
            muted,
        }
    }
}

pub type SnapshotEvent = ServerRealtimeEvent;
