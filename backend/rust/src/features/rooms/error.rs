use crate::error::AppError;

pub fn require_room_name(name: &str) -> Result<String, AppError> {
    let name = name.trim();

    if name.is_empty() {
        return Err(AppError::BadRequest("room_name_required"));
    }

    Ok(name.to_owned())
}
