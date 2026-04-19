CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    hair_color TEXT NOT NULL,
    hair_style TEXT NOT NULL,
    glasses TEXT NOT NULL,
    top_color TEXT NOT NULL,
    bottom_style TEXT NOT NULL,
    height_range TEXT NOT NULL,
    gender_expression TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
