use std::sync::Arc;

use async_trait::async_trait;
use aws_sdk_chimesdkmeetings::Client;
use uuid::Uuid;

use crate::{config::AppConfig, error::AppError};

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

#[derive(Clone)]
pub struct ChimeSdkMeetingProvider {
    client: Client,
    media_region: String,
}

impl ChimeSdkMeetingProvider {
    pub fn new(client: Client, config: &AppConfig) -> Self {
        Self {
            client,
            media_region: config.chime_media_region.clone(),
        }
    }
}

#[async_trait]
impl MeetingProvider for ChimeSdkMeetingProvider {
    async fn create_meeting(
        &self,
        room_id: Uuid,
        meeting_id: Uuid,
    ) -> Result<ProvisionedMeeting, AppError> {
        let external_meeting_id = room_external_meeting_id(room_id);
        let response = self
            .client
            .create_meeting()
            .client_request_token(meeting_id.to_string())
            .external_meeting_id(external_meeting_id.clone())
            .media_region(self.media_region.clone())
            .send()
            .await
            .map_err(|source| AppError::AwsSdk(source.to_string()))?;
        let meeting = response
            .meeting()
            .ok_or_else(|| AppError::AwsSdk("missing meeting payload".to_owned()))?;
        let meeting_id = meeting
            .meeting_id()
            .map(str::to_owned)
            .ok_or_else(|| AppError::AwsSdk("missing meeting id".to_owned()))?;

        Ok(ProvisionedMeeting {
            meeting_id,
            external_meeting_id,
        })
    }

    async fn create_attendee(
        &self,
        meeting_id: &str,
        user_id: &str,
    ) -> Result<ProvisionedAttendee, AppError> {
        let response = self
            .client
            .create_attendee()
            .meeting_id(meeting_id)
            .external_user_id(attendee_external_user_id(user_id))
            .send()
            .await
            .map_err(|source| AppError::AwsSdk(source.to_string()))?;
        let attendee = response
            .attendee()
            .ok_or_else(|| AppError::AwsSdk("missing attendee payload".to_owned()))?;
        let attendee_id = attendee
            .attendee_id()
            .map(str::to_owned)
            .ok_or_else(|| AppError::AwsSdk("missing attendee id".to_owned()))?;
        let join_token = attendee
            .join_token()
            .map(str::to_owned)
            .ok_or_else(|| AppError::AwsSdk("missing attendee join token".to_owned()))?;

        Ok(ProvisionedAttendee {
            attendee_id,
            join_token,
        })
    }

    async fn delete_meeting(&self, meeting_id: &str) -> Result<(), AppError> {
        self.client
            .delete_meeting()
            .meeting_id(meeting_id)
            .send()
            .await
            .map_err(|source| AppError::AwsSdk(source.to_string()))?;

        Ok(())
    }
}

fn room_external_meeting_id(room_id: Uuid) -> String {
    format!("room:{room_id}")
}

fn attendee_external_user_id(user_id: &str) -> String {
    format!("user:{user_id}")
}

pub fn chime_meeting_provider(client: Client, config: &AppConfig) -> Arc<dyn MeetingProvider> {
    Arc::new(ChimeSdkMeetingProvider::new(client, config))
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

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{attendee_external_user_id, room_external_meeting_id};

    #[test]
    fn room_external_meeting_id_is_stable_and_not_aws_prefixed() {
        let room_id =
            Uuid::parse_str("9f16f4ec-0fc5-4e2e-bd15-473d8f8c3d75").expect("uuid should parse");

        assert_eq!(
            room_external_meeting_id(room_id),
            "room:9f16f4ec-0fc5-4e2e-bd15-473d8f8c3d75"
        );
    }

    #[test]
    fn attendee_external_user_id_is_stable_and_not_aws_prefixed() {
        assert_eq!(
            attendee_external_user_id("0d5e1e37-1f6f-49d1-af8f-1ed8d6354213"),
            "user:0d5e1e37-1f6f-49d1-af8f-1ed8d6354213"
        );
    }
}
