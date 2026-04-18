use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use uuid::Uuid;

use crate::{
    app::state::AppState,
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        rooms::{
            dto::{CreateRoomRequest, JoinRoomResponse, RoomDetailResponse, RoomResponse},
            usecase,
        },
    },
    infra::db::rooms_store::SqlxRoomLifecycleStore,
};

pub async fn create_room_handler(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(request): Json<CreateRoomRequest>,
) -> Result<(StatusCode, Json<RoomResponse>), AppError> {
    let store = SqlxRoomLifecycleStore::new(state.db_pool.clone());
    let room = usecase::create_room(&store, &user, request).await?;

    Ok((StatusCode::CREATED, Json(room.into())))
}

pub async fn get_room_handler(
    State(state): State<AppState>,
    _user: AuthenticatedUser,
    Path(room_id): Path<Uuid>,
) -> Result<Json<RoomDetailResponse>, AppError> {
    let store = SqlxRoomLifecycleStore::new(state.db_pool.clone());
    let room = usecase::get_room(&store, room_id).await?;

    Ok(Json(room.into()))
}

pub async fn join_room_handler(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(room_id): Path<Uuid>,
) -> Result<Json<JoinRoomResponse>, AppError> {
    let store = SqlxRoomLifecycleStore::new(state.db_pool.clone());
    let room = usecase::join_room(&store, state.meeting_provider.as_ref(), &user, room_id).await?;

    Ok(Json(room.into()))
}

pub async fn leave_room_handler(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(room_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let store = SqlxRoomLifecycleStore::new(state.db_pool.clone());
    usecase::leave_room(
        &store,
        state.meeting_provider.as_ref(),
        state.realtime_store.as_ref(),
        &user,
        room_id,
    )
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
