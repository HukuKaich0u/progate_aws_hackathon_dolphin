use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::features::rooms::domain::{Room, RoomDetail, RoomJoin};

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

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct JoinRoomResponse {
    pub room_id: Uuid,
    pub meeting_id: String,
    pub external_meeting_id: String,
    pub attendee_id: String,
    pub join_token: String,
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

impl From<RoomJoin> for JoinRoomResponse {
    fn from(value: RoomJoin) -> Self {
        Self {
            room_id: value.room.id,
            meeting_id: value.meeting_id,
            external_meeting_id: value.external_meeting_id,
            attendee_id: value.attendee_id,
            join_token: value.join_token,
        }
    }
}
