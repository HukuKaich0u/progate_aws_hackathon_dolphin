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
pub struct SnapshotEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub room_id: Uuid,
    pub participants: Vec<ParticipantSnapshot>,
}

impl SnapshotEvent {
    pub fn new(room_id: Uuid, participants: Vec<ParticipantSnapshot>) -> Self {
        Self {
            event_type: "snapshot".to_owned(),
            room_id,
            participants,
        }
    }
}
