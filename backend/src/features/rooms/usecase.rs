use uuid::Uuid;

use crate::{
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        rooms::{
            domain::{Room, RoomDetail},
            dto::CreateRoomRequest,
            error::require_room_name,
            store::{CreateRoomRecord, RoomLifecycleStore},
        },
    },
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
