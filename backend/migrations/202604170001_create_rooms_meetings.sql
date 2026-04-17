CREATE TABLE rooms (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meetings (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    chime_meeting_id TEXT NOT NULL,
    external_meeting_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX meetings_one_active_per_room_idx
    ON meetings (room_id)
    WHERE status = 'active';

CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    chime_attendee_id TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ
);
