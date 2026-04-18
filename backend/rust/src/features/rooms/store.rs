use async_trait::async_trait;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateRoomRecord {
    pub room_id: Uuid,
    pub name: String,
    pub created_by: String,
}

#[derive(Clone, Debug, PartialEq, Eq, sqlx::FromRow)]
pub struct RoomRecord {
    pub id: Uuid,
    pub name: String,
    pub created_by: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateMeetingRecord {
    pub meeting_id: Uuid,
    pub room_id: Uuid,
    pub chime_meeting_id: String,
    pub external_meeting_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, sqlx::FromRow)]
pub struct MeetingRecord {
    pub id: Uuid,
    pub room_id: Uuid,
    pub chime_meeting_id: String,
    pub external_meeting_id: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateAttendeeRecord {
    pub attendee_id: Uuid,
    pub meeting_id: Uuid,
    pub user_id: String,
    pub chime_attendee_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, sqlx::FromRow)]
pub struct AttendeeRecord {
    pub id: Uuid,
    pub meeting_id: Uuid,
    pub user_id: String,
    pub chime_attendee_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LeaveOutcome {
    pub ended_meeting_id: Option<Uuid>,
}

#[async_trait]
pub trait RoomLifecycleStore: Send + Sync {
    async fn create_room(&self, input: CreateRoomRecord) -> Result<RoomRecord, AppError>;
    async fn get_room(&self, room_id: Uuid) -> Result<Option<RoomRecord>, AppError>;
    async fn get_active_meeting(&self, room_id: Uuid) -> Result<Option<MeetingRecord>, AppError>;
    async fn create_meeting(&self, input: CreateMeetingRecord) -> Result<MeetingRecord, AppError>;
    async fn create_attendee(
        &self,
        input: CreateAttendeeRecord,
    ) -> Result<AttendeeRecord, AppError>;
    async fn has_active_attendee(&self, room_id: Uuid, user_id: &str) -> Result<bool, AppError>;
    async fn leave_room(&self, room_id: Uuid, user_id: &str) -> Result<LeaveOutcome, AppError>;
}
