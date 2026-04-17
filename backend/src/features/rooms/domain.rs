use uuid::Uuid;

use crate::features::rooms::store::RoomRecord;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Room {
    pub id: Uuid,
    pub name: String,
    pub created_by: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoomDetail {
    pub room: Room,
    pub has_active_meeting: bool,
}

impl From<RoomRecord> for Room {
    fn from(value: RoomRecord) -> Self {
        Self {
            id: value.id,
            name: value.name,
            created_by: value.created_by,
        }
    }
}
