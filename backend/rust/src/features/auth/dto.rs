use serde::Serialize;

use crate::features::auth::context::AuthenticatedUser;

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct CurrentUserResponse {
    pub user_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub groups: Vec<String>,
}

impl From<AuthenticatedUser> for CurrentUserResponse {
    fn from(user: AuthenticatedUser) -> Self {
        Self {
            user_id: user.user_id,
            email: None,
            groups: vec![],
        }
    }
}
