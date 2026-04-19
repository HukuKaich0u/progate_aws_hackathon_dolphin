use crate::features::profile::store::ProfileRecord;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Profile {
    pub user_id: String,
    pub hair_color: String,
    pub hair_style: String,
    pub glasses: String,
    pub top_color: String,
    pub bottom_style: String,
    pub height_range: String,
    pub gender_expression: String,
}

impl From<ProfileRecord> for Profile {
    fn from(value: ProfileRecord) -> Self {
        Self {
            user_id: value.user_id,
            hair_color: value.hair_color,
            hair_style: value.hair_style,
            glasses: value.glasses,
            top_color: value.top_color,
            bottom_style: value.bottom_style,
            height_range: value.height_range,
            gender_expression: value.gender_expression,
        }
    }
}
