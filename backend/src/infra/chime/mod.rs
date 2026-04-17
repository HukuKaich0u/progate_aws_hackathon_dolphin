use std::sync::Arc;

use async_trait::async_trait;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProvisionedMeeting {
    pub meeting_id: String,
    pub external_meeting_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProvisionedAttendee {
    pub attendee_id: String,
    pub join_token: String,
}

#[async_trait]
pub trait MeetingProvider: Send + Sync {
    async fn create_meeting(
        &self,
        room_id: Uuid,
        meeting_id: Uuid,
    ) -> Result<ProvisionedMeeting, AppError>;
    async fn create_attendee(
        &self,
        meeting_id: &str,
        user_id: &str,
    ) -> Result<ProvisionedAttendee, AppError>;
    async fn delete_meeting(&self, meeting_id: &str) -> Result<(), AppError>;
}

#[derive(Clone, Default)]
pub struct NoopMeetingProvider;

#[async_trait]
impl MeetingProvider for NoopMeetingProvider {
    async fn create_meeting(
        &self,
        _room_id: Uuid,
        _meeting_id: Uuid,
    ) -> Result<ProvisionedMeeting, AppError> {
        Err(AppError::AwsSdk(
            "meeting provider not configured".to_owned(),
        ))
    }

    async fn create_attendee(
        &self,
        _meeting_id: &str,
        _user_id: &str,
    ) -> Result<ProvisionedAttendee, AppError> {
        Err(AppError::AwsSdk(
            "meeting provider not configured".to_owned(),
        ))
    }

    async fn delete_meeting(&self, _meeting_id: &str) -> Result<(), AppError> {
        Err(AppError::AwsSdk(
            "meeting provider not configured".to_owned(),
        ))
    }
}

pub fn default_meeting_provider() -> Arc<dyn MeetingProvider> {
    Arc::new(NoopMeetingProvider)
}
