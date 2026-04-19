use tracing::info;

use crate::{
    error::AppError,
    features::{
        auth::context::AuthenticatedUser,
        profile::{
            domain::Profile,
            dto::UpsertProfileRequest,
            store::{ProfileStore, UpsertProfileRecord},
        },
    },
};

pub async fn get_profile<S: ProfileStore>(
    store: &S,
    user: &AuthenticatedUser,
) -> Result<Option<Profile>, AppError> {
    let record = store.get_profile(&user.user_id).await?;
    Ok(record.map(Profile::from))
}

pub async fn list_profiles<S: ProfileStore>(store: &S) -> Result<Vec<Profile>, AppError> {
    let records = store.list_profiles().await?;
    Ok(records.into_iter().map(Profile::from).collect())
}

pub async fn upsert_profile<S: ProfileStore>(
    store: &S,
    user: &AuthenticatedUser,
    request: UpsertProfileRequest,
) -> Result<Profile, AppError> {
    let input = UpsertProfileRecord {
        user_id: user.user_id.clone(),
        hair_color: require_field("hair_color", request.hair_color)?,
        hair_style: require_field("hair_style", request.hair_style)?,
        glasses: require_field("glasses", request.glasses)?,
        top_color: require_field("top_color", request.top_color)?,
        bottom_style: require_field("bottom_style", request.bottom_style)?,
        height_range: require_field("height_range", request.height_range)?,
        gender_expression: require_field("gender_expression", request.gender_expression)?,
    };

    let record = store.upsert_profile(input).await?;

    info!(user_id = %user.user_id, "profile upserted");

    Ok(record.into())
}

fn require_field(name: &'static str, value: String) -> Result<String, AppError> {
    let trimmed = value.trim().to_owned();
    if trimmed.is_empty() {
        return Err(AppError::BadRequest(name));
    }
    Ok(trimmed)
}
