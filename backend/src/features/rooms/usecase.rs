use uuid::Uuid;

use crate::{
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        rooms::{
            domain::{Room, RoomDetail, RoomJoin},
            dto::CreateRoomRequest,
            error::require_room_name,
            store::{
                CreateAttendeeRecord, CreateMeetingRecord, CreateRoomRecord, MeetingRecord,
                RoomLifecycleStore,
            },
        },
    },
    infra::chime::MeetingProvider,
};

pub async fn create_room<S: RoomLifecycleStore>(
    store: &S,
    user: &AuthenticatedUser,
    request: CreateRoomRequest,
) -> Result<Room, AppError> {
    let room = store
        .create_room(CreateRoomRecord {
            room_id: Uuid::new_v4(),
            name: require_room_name(&request.name)?,
            created_by: user.user_id.clone(),
        })
        .await?;

    Ok(room.into())
}

pub async fn get_room<S: RoomLifecycleStore>(
    store: &S,
    room_id: Uuid,
) -> Result<RoomDetail, AppError> {
    let room = store.get_room(room_id).await?.ok_or(AppError::NotFound)?;
    let has_active_meeting = store.get_active_meeting(room.id).await?.is_some();

    Ok(RoomDetail {
        room: room.into(),
        has_active_meeting,
    })
}

pub async fn join_room<S: RoomLifecycleStore, M: MeetingProvider + ?Sized>(
    store: &S,
    meeting_provider: &M,
    user: &AuthenticatedUser,
    room_id: Uuid,
) -> Result<RoomJoin, AppError> {
    let room = store.get_room(room_id).await?.ok_or(AppError::NotFound)?;
    let meeting = resolve_active_meeting(store, meeting_provider, room.id).await?;
    let attendee = meeting_provider
        .create_attendee(&meeting.chime_meeting_id, &user.user_id)
        .await?;

    store
        .create_attendee(CreateAttendeeRecord {
            attendee_id: Uuid::new_v4(),
            meeting_id: meeting.id,
            user_id: user.user_id.clone(),
            chime_attendee_id: attendee.attendee_id.clone(),
        })
        .await?;

    Ok(RoomJoin {
        room: room.into(),
        meeting_id: meeting.chime_meeting_id,
        external_meeting_id: meeting.external_meeting_id,
        attendee_id: attendee.attendee_id,
        join_token: attendee.join_token,
    })
}

pub async fn leave_room<S: RoomLifecycleStore, M: MeetingProvider + ?Sized>(
    store: &S,
    meeting_provider: &M,
    user: &AuthenticatedUser,
    room_id: Uuid,
) -> Result<(), AppError> {
    let room = store.get_room(room_id).await?.ok_or(AppError::NotFound)?;
    let active_meeting = store.get_active_meeting(room.id).await?;
    let Some(active_meeting) = active_meeting else {
        return Ok(());
    };

    let outcome = store.leave_room(room.id, &user.user_id).await?;
    if outcome.ended_meeting_id == Some(active_meeting.id) {
        let _ = meeting_provider
            .delete_meeting(&active_meeting.chime_meeting_id)
            .await;
    }

    Ok(())
}

async fn resolve_active_meeting<S: RoomLifecycleStore, M: MeetingProvider + ?Sized>(
    store: &S,
    meeting_provider: &M,
    room_id: Uuid,
) -> Result<MeetingRecord, AppError> {
    if let Some(meeting) = store.get_active_meeting(room_id).await? {
        return Ok(meeting);
    }

    let requested_meeting_id = Uuid::new_v4();
    let provisioned_meeting = meeting_provider
        .create_meeting(room_id, requested_meeting_id)
        .await?;

    match store
        .create_meeting(CreateMeetingRecord {
            meeting_id: requested_meeting_id,
            room_id,
            chime_meeting_id: provisioned_meeting.meeting_id.clone(),
            external_meeting_id: provisioned_meeting.external_meeting_id,
        })
        .await
    {
        Ok(meeting) => Ok(meeting),
        Err(error) if is_unique_violation(&error) => {
            let _ = meeting_provider
                .delete_meeting(&provisioned_meeting.meeting_id)
                .await;

            store.get_active_meeting(room_id).await?.ok_or(error)
        }
        Err(error) => Err(error),
    }
}

fn is_unique_violation(error: &AppError) -> bool {
    match error {
        AppError::Database(error) => error
            .as_database_error()
            .and_then(|database_error| database_error.code())
            .is_some_and(|code| code == "23505"),
        _ => false,
    }
}
