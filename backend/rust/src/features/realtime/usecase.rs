use uuid::Uuid;

use crate::{
    error::AppError,
    features::{auth::context::AuthenticatedUser, rooms::store::RoomLifecycleStore},
};

pub async fn ensure_room_membership<S: RoomLifecycleStore>(
    store: &S,
    room_id: Uuid,
    user: &AuthenticatedUser,
) -> Result<(), AppError> {
    if store.has_active_attendee(room_id, &user.user_id).await? {
        Ok(())
    } else {
        Err(AppError::Unauthorized)
    }
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use uuid::Uuid;

    use crate::{
        error::AppError,
        features::{
            auth::context::AuthenticatedUser,
            rooms::store::{
                AttendeeRecord, CreateAttendeeRecord, CreateMeetingRecord, CreateRoomRecord,
                LeaveOutcome, MeetingRecord, RoomLifecycleStore, RoomRecord,
            },
        },
    };

    use super::ensure_room_membership;

    #[derive(Default)]
    struct FakeRoomLifecycleStore;

    #[async_trait]
    impl RoomLifecycleStore for FakeRoomLifecycleStore {
        async fn create_room(&self, _input: CreateRoomRecord) -> Result<RoomRecord, AppError> {
            unreachable!("not needed in this test")
        }

        async fn get_room(&self, _room_id: Uuid) -> Result<Option<RoomRecord>, AppError> {
            unreachable!("not needed in this test")
        }

        async fn get_active_meeting(
            &self,
            _room_id: Uuid,
        ) -> Result<Option<MeetingRecord>, AppError> {
            unreachable!("not needed in this test")
        }

        async fn create_meeting(
            &self,
            _input: CreateMeetingRecord,
        ) -> Result<MeetingRecord, AppError> {
            unreachable!("not needed in this test")
        }

        async fn create_attendee(
            &self,
            _input: CreateAttendeeRecord,
        ) -> Result<AttendeeRecord, AppError> {
            unreachable!("not needed in this test")
        }

        async fn has_active_attendee(
            &self,
            _room_id: Uuid,
            _user_id: &str,
        ) -> Result<bool, AppError> {
            Ok(false)
        }

        async fn leave_room(
            &self,
            _room_id: Uuid,
            _user_id: &str,
        ) -> Result<LeaveOutcome, AppError> {
            unreachable!("not needed in this test")
        }
    }

    #[tokio::test]
    async fn ensure_room_membership_rejects_user_without_active_attendee() {
        let store = FakeRoomLifecycleStore;
        let user = AuthenticatedUser {
            user_id: "user-1".to_owned(),
        };

        let error = ensure_room_membership(&store, Uuid::new_v4(), &user)
            .await
            .expect_err("user without active attendee should be rejected");

        assert!(matches!(error, AppError::Unauthorized));
    }
}
