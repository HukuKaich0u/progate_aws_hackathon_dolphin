use axum::Json;

use crate::features::auth::{context::AuthenticatedUser, dto::CurrentUserResponse};

pub async fn get_current_user_handler(user: AuthenticatedUser) -> Json<CurrentUserResponse> {
    Json(user.into())
}

#[cfg(test)]
mod tests {
    use super::get_current_user_handler;
    use crate::features::auth::context::AuthenticatedUser;

    #[tokio::test]
    async fn returns_authenticated_user_payload() {
        let response = get_current_user_handler(AuthenticatedUser {
            user_id: "user-123".to_owned(),
        })
        .await;

        assert_eq!(response.0.user_id, "user-123");
        assert_eq!(response.0.email, None);
        assert!(response.0.groups.is_empty());
    }
}
