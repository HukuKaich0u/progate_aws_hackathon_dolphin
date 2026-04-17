use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::features::rooms::domain::{Room, RoomDetail};

#[derive(Debug, Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct RoomResponse {
    pub room_id: Uuid,
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct RoomDetailResponse {
    pub room_id: Uuid,
    pub name: String,
    pub has_active_meeting: bool,
}

impl From<Room> for RoomResponse {
    fn from(value: Room) -> Self {
        Self {
            room_id: value.id,
            name: value.name,
        }
    }
}

impl From<RoomDetail> for RoomDetailResponse {
    fn from(value: RoomDetail) -> Self {
        Self {
            room_id: value.room.id,
            name: value.room.name,
            has_active_meeting: value.has_active_meeting,
        }
    }
}
