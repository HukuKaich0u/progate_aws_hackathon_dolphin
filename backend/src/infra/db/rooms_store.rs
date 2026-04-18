use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    features::rooms::store::{
        AttendeeRecord, CreateAttendeeRecord, CreateMeetingRecord, CreateRoomRecord, LeaveOutcome,
        MeetingRecord, RoomLifecycleStore, RoomRecord,
    },
};

const ACTIVE_MEETING_STATUS: &str = "active";
const ENDED_MEETING_STATUS: &str = "ended";

#[derive(Clone)]
pub struct SqlxRoomLifecycleStore {
    pool: PgPool,
}

impl SqlxRoomLifecycleStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl RoomLifecycleStore for SqlxRoomLifecycleStore {
    async fn create_room(&self, input: CreateRoomRecord) -> Result<RoomRecord, AppError> {
        let room = sqlx::query_as::<_, RoomRecord>(
            r#"
            INSERT INTO rooms (id, name, created_by)
            VALUES ($1, $2, $3)
            RETURNING id, name, created_by
            "#,
        )
        .bind(input.room_id)
        .bind(input.name)
        .bind(input.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(room)
    }

    async fn get_room(&self, room_id: Uuid) -> Result<Option<RoomRecord>, AppError> {
        let room = sqlx::query_as::<_, RoomRecord>(
            r#"
            SELECT id, name, created_by
            FROM rooms
            WHERE id = $1
            "#,
        )
        .bind(room_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(room)
    }

    async fn get_active_meeting(&self, room_id: Uuid) -> Result<Option<MeetingRecord>, AppError> {
        let meeting = sqlx::query_as::<_, MeetingRecord>(
            r#"
            SELECT id, room_id, chime_meeting_id, external_meeting_id, status
            FROM meetings
            WHERE room_id = $1 AND status = $2
            "#,
        )
        .bind(room_id)
        .bind(ACTIVE_MEETING_STATUS)
        .fetch_optional(&self.pool)
        .await?;

        Ok(meeting)
    }

    async fn create_meeting(&self, input: CreateMeetingRecord) -> Result<MeetingRecord, AppError> {
        let meeting = sqlx::query_as::<_, MeetingRecord>(
            r#"
            INSERT INTO meetings (id, room_id, chime_meeting_id, external_meeting_id, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, room_id, chime_meeting_id, external_meeting_id, status
            "#,
        )
        .bind(input.meeting_id)
        .bind(input.room_id)
        .bind(input.chime_meeting_id)
        .bind(input.external_meeting_id)
        .bind(ACTIVE_MEETING_STATUS)
        .fetch_one(&self.pool)
        .await?;

        Ok(meeting)
    }

    async fn create_attendee(
        &self,
        input: CreateAttendeeRecord,
    ) -> Result<AttendeeRecord, AppError> {
        let attendee = sqlx::query_as::<_, AttendeeRecord>(
            r#"
            INSERT INTO meeting_attendees (id, meeting_id, user_id, chime_attendee_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, meeting_id, user_id, chime_attendee_id
            "#,
        )
        .bind(input.attendee_id)
        .bind(input.meeting_id)
        .bind(input.user_id)
        .bind(input.chime_attendee_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(attendee)
    }

    async fn has_active_attendee(&self, room_id: Uuid, user_id: &str) -> Result<bool, AppError> {
        let has_active_attendee = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM meeting_attendees attendees
                INNER JOIN meetings meetings ON meetings.id = attendees.meeting_id
                WHERE meetings.room_id = $1
                  AND meetings.status = $2
                  AND attendees.user_id = $3
                  AND attendees.left_at IS NULL
            )
            "#,
        )
        .bind(room_id)
        .bind(ACTIVE_MEETING_STATUS)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(has_active_attendee)
    }

    async fn leave_room(&self, room_id: Uuid, user_id: &str) -> Result<LeaveOutcome, AppError> {
        let mut tx = self.pool.begin().await?;

        let meeting_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            SELECT id
            FROM meetings
            WHERE room_id = $1 AND status = $2
            FOR UPDATE
            "#,
        )
        .bind(room_id)
        .bind(ACTIVE_MEETING_STATUS)
        .fetch_optional(&mut *tx)
        .await?;

        let Some(meeting_id) = meeting_id else {
            tx.commit().await?;
            return Ok(LeaveOutcome {
                ended_meeting_id: None,
            });
        };

        sqlx::query(
            r#"
            UPDATE meeting_attendees
            SET left_at = NOW()
            WHERE meeting_id = $1 AND user_id = $2 AND left_at IS NULL
            "#,
        )
        .bind(meeting_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        let active_attendee_count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)
            FROM meeting_attendees
            WHERE meeting_id = $1 AND left_at IS NULL
            "#,
        )
        .bind(meeting_id)
        .fetch_one(&mut *tx)
        .await?;

        let ended_meeting_id = if active_attendee_count == 0 {
            sqlx::query(
                r#"
                UPDATE meetings
                SET status = $2, ended_at = NOW()
                WHERE id = $1 AND status = $3
                "#,
            )
            .bind(meeting_id)
            .bind(ENDED_MEETING_STATUS)
            .bind(ACTIVE_MEETING_STATUS)
            .execute(&mut *tx)
            .await?;

            Some(meeting_id)
        } else {
            None
        };

        tx.commit().await?;

        Ok(LeaveOutcome { ended_meeting_id })
    }
}

#[cfg(test)]
mod tests {
    use sqlx::PgPool;
    use uuid::Uuid;

    use crate::features::rooms::store::{
        CreateAttendeeRecord, CreateMeetingRecord, CreateRoomRecord, RoomLifecycleStore,
    };

    use super::SqlxRoomLifecycleStore;

    #[sqlx::test]
    async fn store_allows_only_one_active_meeting_per_room(pool: PgPool) -> sqlx::Result<()> {
        let store = SqlxRoomLifecycleStore::new(pool);
        let room = store
            .create_room(CreateRoomRecord {
                room_id: Uuid::new_v4(),
                name: "General".to_owned(),
                created_by: "user-1".to_owned(),
            })
            .await
            .expect("room should be created");

        store
            .create_meeting(CreateMeetingRecord {
                meeting_id: Uuid::new_v4(),
                room_id: room.id,
                chime_meeting_id: "chime-meeting-1".to_owned(),
                external_meeting_id: "external-1".to_owned(),
            })
            .await
            .expect("first active meeting should be created");

        let duplicate = store
            .create_meeting(CreateMeetingRecord {
                meeting_id: Uuid::new_v4(),
                room_id: room.id,
                chime_meeting_id: "chime-meeting-2".to_owned(),
                external_meeting_id: "external-2".to_owned(),
            })
            .await;

        assert!(duplicate.is_err(), "second active meeting should fail");

        Ok(())
    }

    #[sqlx::test]
    async fn leave_marks_meeting_ended_when_last_attendee_leaves(pool: PgPool) -> sqlx::Result<()> {
        let store = SqlxRoomLifecycleStore::new(pool.clone());
        let room = store
            .create_room(CreateRoomRecord {
                room_id: Uuid::new_v4(),
                name: "General".to_owned(),
                created_by: "user-1".to_owned(),
            })
            .await
            .expect("room should be created");
        let meeting = store
            .create_meeting(CreateMeetingRecord {
                meeting_id: Uuid::new_v4(),
                room_id: room.id,
                chime_meeting_id: "chime-meeting-1".to_owned(),
                external_meeting_id: "external-1".to_owned(),
            })
            .await
            .expect("meeting should be created");

        store
            .create_attendee(CreateAttendeeRecord {
                attendee_id: Uuid::new_v4(),
                meeting_id: meeting.id,
                user_id: "user-1".to_owned(),
                chime_attendee_id: "attendee-1".to_owned(),
            })
            .await
            .expect("attendee should be created");

        let outcome = store
            .leave_room(room.id, "user-1")
            .await
            .expect("leave should succeed");

        assert_eq!(outcome.ended_meeting_id, Some(meeting.id));

        let active_meeting = store
            .get_active_meeting(room.id)
            .await
            .expect("active meeting lookup should succeed");

        assert!(active_meeting.is_none(), "meeting should be ended");

        Ok(())
    }

    #[sqlx::test]
    async fn has_active_attendee_returns_true_for_joined_user(pool: PgPool) -> sqlx::Result<()> {
        let store = SqlxRoomLifecycleStore::new(pool);
        let room = store
            .create_room(CreateRoomRecord {
                room_id: Uuid::new_v4(),
                name: "General".to_owned(),
                created_by: "user-1".to_owned(),
            })
            .await
            .expect("room should be created");
        let meeting = store
            .create_meeting(CreateMeetingRecord {
                meeting_id: Uuid::new_v4(),
                room_id: room.id,
                chime_meeting_id: "chime-meeting-1".to_owned(),
                external_meeting_id: "external-1".to_owned(),
            })
            .await
            .expect("meeting should be created");

        store
            .create_attendee(CreateAttendeeRecord {
                attendee_id: Uuid::new_v4(),
                meeting_id: meeting.id,
                user_id: "user-1".to_owned(),
                chime_attendee_id: "attendee-1".to_owned(),
            })
            .await
            .expect("attendee should be created");

        let has_active_attendee = store
            .has_active_attendee(room.id, "user-1")
            .await
            .expect("membership lookup should succeed");

        assert!(has_active_attendee);

        Ok(())
    }
}
