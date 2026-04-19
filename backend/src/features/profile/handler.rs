use axum::{Json, extract::State, http::StatusCode};

use crate::{
    app::state::AppState,
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        profile::{
            dto::{ProfileResponse, UpsertProfileRequest},
            usecase,
        },
    },
    infra::db::profiles_store::SqlxProfileStore,
};

pub async fn list_profiles_handler(
    State(state): State<AppState>,
    _user: AuthenticatedUser,
) -> Result<Json<Vec<ProfileResponse>>, AppError> {
    let store = SqlxProfileStore::new(state.db_pool.clone());
    let profiles = usecase::list_profiles(&store).await?;

    Ok(Json(profiles.into_iter().map(ProfileResponse::from).collect()))
}

pub async fn get_my_profile_handler(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<ProfileResponse>, AppError> {
    let store = SqlxProfileStore::new(state.db_pool.clone());
    let profile = usecase::get_profile(&store, &user)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(profile.into()))
}

pub async fn upsert_my_profile_handler(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(request): Json<UpsertProfileRequest>,
) -> Result<(StatusCode, Json<ProfileResponse>), AppError> {
    let store = SqlxProfileStore::new(state.db_pool.clone());
    let profile = usecase::upsert_profile(&store, &user, request).await?;

    Ok((StatusCode::OK, Json(profile.into())))
}
