# Chime Control Plane Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `backend/` に Cognito 認証済みユーザー向けの Chime control plane を実装し、永続 room の create/get/join/leave を動かす

**Architecture:** 既存 scaffold を `auth` と `rooms` の縦スライスへ拡張する。`room` は永続、`meeting` は短命、`join` が active meeting を解決し、`leave` が最後の参加者なら meeting を終了する。外部境界は `Cognito verifier` と `Chime client` を trait で切り、DB は `sqlx` 実装で持つ。

**Tech Stack:** Rust, axum, tokio, sqlx, PostgreSQL, aws-config, aws-sdk-chimesdkmeetings, jsonwebtoken, reqwest, uuid, time, dotenvy, tracing

---

## Chunk 1: Foundation

### Task 1: Harden runtime, config, errors

**Files:**
- Modify: `backend/Cargo.toml`
- Modify: `backend/src/config.rs`
- Modify: `backend/src/error.rs`
- Modify: `backend/src/main.rs`
- Modify: `backend/src/app/state.rs`
- Modify: `backend/.env.example`
- Modify: `backend/Dockerfile`
- Modify: `backend/README.md`
- Test: `backend/src/config.rs`
- Test: `backend/src/error.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[test]
fn from_env_reads_aws_and_cognito_settings() {
    // APP_HOST, APP_PORT, DATABASE_URL, AWS_REGION,
    // CHIME_MEDIA_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID
}

#[test]
fn internal_errors_do_not_leak_raw_messages() {
    // response body should be stable like {"error":"internal_server_error"}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml from_env_reads_aws_and_cognito_settings`
Expected: FAIL because config fields do not exist yet

- [ ] **Step 3: Write minimal implementation**

```rust
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub aws_region: String,
    pub chime_media_region: String,
    pub cognito_user_pool_id: String,
    pub cognito_client_id: String,
}
```

```rust
dotenvy::dotenv().ok();
```

```rust
pub enum AppError {
    Config(...),
    Unauthorized,
    NotFound,
    Database(sqlx::Error),
    AwsSdk(String),
    ServerIo(std::io::Error),
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml config::tests error::tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/Cargo.toml backend/src/config.rs backend/src/error.rs backend/src/main.rs backend/src/app/state.rs backend/.env.example backend/Dockerfile backend/README.md
git commit -m "chore(backend): harden runtime config and errors"
```

### Task 2: Add request identity and app wiring

**Files:**
- Create: `backend/src/app/request_id.rs`
- Modify: `backend/src/app/mod.rs`
- Modify: `backend/src/app/router.rs`
- Modify: `backend/src/lib.rs`
- Test: `backend/src/app/request_id.rs`
- Test: `backend/src/app/router.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[tokio::test]
async fn router_sets_x_request_id_header() {
    // GET /health should return x-request-id
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml router_sets_x_request_id_header`
Expected: FAIL because middleware is missing

- [ ] **Step 3: Write minimal implementation**

```rust
pub fn request_id_layer() -> impl Layer<Router> {
    // attach x-request-id, reuse incoming header if present
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml router_sets_x_request_id_header`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/request_id.rs backend/src/app/mod.rs backend/src/app/router.rs backend/src/lib.rs
git commit -m "feat(backend): add request id middleware"
```

## Chunk 2: Schema And Ports

### Task 3: Add room lifecycle schema and sqlx store

**Files:**
- Create: `backend/migrations/202604170001_create_rooms_meetings.sql`
- Create: `backend/src/features/rooms/store.rs`
- Create: `backend/src/infra/db/rooms_store.rs`
- Modify: `backend/src/infra/db/mod.rs`
- Modify: `backend/src/infra/mod.rs`
- Test: `backend/src/infra/db/rooms_store.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[sqlx::test]
async fn store_allows_only_one_active_meeting_per_room(pool: PgPool) {
    // second active insert for same room must fail or resolve same row
}

#[sqlx::test]
async fn leave_marks_meeting_ended_when_last_attendee_leaves(pool: PgPool) {
    // room -> meeting -> attendee -> leave => meeting.status == ended
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml store_allows_only_one_active_meeting_per_room`
Expected: FAIL because schema/store do not exist

- [ ] **Step 3: Write minimal implementation**

```sql
create table rooms (...);
create table meetings (...);
create table meeting_attendees (...);
create unique index meetings_one_active_per_room_idx
on meetings (room_id) where status = 'active';
```

```rust
#[async_trait]
pub trait RoomLifecycleStore: Send + Sync {
    async fn create_room(&self, input: CreateRoomRecord) -> Result<RoomRecord, AppError>;
    async fn get_room(&self, room_id: Uuid) -> Result<Option<RoomRecord>, AppError>;
    async fn get_active_meeting(&self, room_id: Uuid) -> Result<Option<MeetingRecord>, AppError>;
    async fn create_meeting(&self, input: CreateMeetingRecord) -> Result<MeetingRecord, AppError>;
    async fn create_attendee(&self, input: CreateAttendeeRecord) -> Result<AttendeeRecord, AppError>;
    async fn leave_room(&self, room_id: Uuid, user_id: &str) -> Result<LeaveOutcome, AppError>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml store_allows_only_one_active_meeting_per_room leave_marks_meeting_ended_when_last_attendee_leaves`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/202604170001_create_rooms_meetings.sql backend/src/features/rooms/store.rs backend/src/infra/db/rooms_store.rs backend/src/infra/db/mod.rs backend/src/infra/mod.rs
git commit -m "feat(backend): add room lifecycle schema and store"
```

### Task 4: Add auth and Chime ports with test doubles

**Files:**
- Create: `backend/src/features/auth/mod.rs`
- Create: `backend/src/features/auth/context.rs`
- Create: `backend/src/features/auth/extractor.rs`
- Create: `backend/src/features/auth/verifier.rs`
- Create: `backend/src/infra/auth/mod.rs`
- Create: `backend/src/infra/chime/mod.rs`
- Create: `backend/tests/support/mod.rs`
- Modify: `backend/src/features/mod.rs`
- Modify: `backend/src/app/state.rs`
- Test: `backend/src/features/auth/extractor.rs`
- Test: `backend/tests/support/mod.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[tokio::test]
async fn protected_route_rejects_missing_bearer_token() {
    // expect 401
}

#[tokio::test]
async fn protected_route_exposes_authenticated_user_from_fake_verifier() {
    // fake verifier returns sub=user-123
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml protected_route_rejects_missing_bearer_token`
Expected: FAIL because extractor/verifier do not exist

- [ ] **Step 3: Write minimal implementation**

```rust
pub struct AuthenticatedUser {
    pub user_id: String,
}

#[async_trait]
pub trait TokenVerifier: Send + Sync {
    async fn verify(&self, bearer: &str) -> Result<AuthenticatedUser, AppError>;
}
```

```rust
#[async_trait]
pub trait MeetingProvider: Send + Sync {
    async fn create_meeting(&self, room_id: Uuid, meeting_id: Uuid) -> Result<ProvisionedMeeting, AppError>;
    async fn create_attendee(&self, meeting_id: &str, user_id: &str) -> Result<ProvisionedAttendee, AppError>;
    async fn delete_meeting(&self, meeting_id: &str) -> Result<(), AppError>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml protected_route_rejects_missing_bearer_token protected_route_exposes_authenticated_user_from_fake_verifier`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/auth backend/src/infra/auth/mod.rs backend/src/infra/chime/mod.rs backend/tests/support/mod.rs backend/src/features/mod.rs backend/src/app/state.rs
git commit -m "feat(backend): add auth and chime ports"
```

## Chunk 3: Rooms API

### Task 5: Implement create/get room API

**Files:**
- Create: `backend/src/features/rooms/mod.rs`
- Create: `backend/src/features/rooms/domain.rs`
- Create: `backend/src/features/rooms/dto.rs`
- Create: `backend/src/features/rooms/error.rs`
- Create: `backend/src/features/rooms/handler.rs`
- Create: `backend/src/features/rooms/usecase.rs`
- Modify: `backend/src/features/mod.rs`
- Modify: `backend/src/app/router.rs`
- Create: `backend/tests/rooms_api.rs`
- Modify: `backend/tests/support/mod.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[tokio::test]
async fn create_room_returns_201_and_uuid() {
    // POST /v1/rooms
}

#[tokio::test]
async fn get_room_returns_active_meeting_false_for_new_room() {
    // GET /v1/rooms/:room_id
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml --test rooms_api create_room_returns_201_and_uuid`
Expected: FAIL because routes do not exist

- [ ] **Step 3: Write minimal implementation**

```rust
pub struct CreateRoomRequest {
    pub name: String,
}

pub async fn create_room(...) -> Result<(StatusCode, Json<RoomResponse>), AppError> { ... }
pub async fn get_room(...) -> Result<Json<RoomDetailResponse>, AppError> { ... }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml --test rooms_api create_room_returns_201_and_uuid get_room_returns_active_meeting_false_for_new_room`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/rooms backend/src/features/mod.rs backend/src/app/router.rs backend/tests/rooms_api.rs backend/tests/support/mod.rs
git commit -m "feat(backend): add room create and get api"
```

### Task 6: Implement join/leave lifecycle with Chime

**Files:**
- Modify: `backend/src/features/rooms/dto.rs`
- Modify: `backend/src/features/rooms/error.rs`
- Modify: `backend/src/features/rooms/handler.rs`
- Modify: `backend/src/features/rooms/usecase.rs`
- Modify: `backend/src/features/rooms/store.rs`
- Modify: `backend/src/infra/db/rooms_store.rs`
- Modify: `backend/src/infra/chime/mod.rs`
- Modify: `backend/src/app/router.rs`
- Modify: `backend/tests/rooms_api.rs`
- Modify: `backend/tests/support/mod.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[tokio::test]
async fn first_join_creates_meeting_and_attendee() {
    // POST /v1/rooms/:id/join on empty room
}

#[tokio::test]
async fn second_join_reuses_active_meeting() {
    // same room, different user => same meeting id
}

#[tokio::test]
async fn last_leave_ends_meeting_and_next_join_recreates_it() {
    // leave all users => ended => next join creates new meeting id
}

#[tokio::test]
async fn concurrent_joins_create_only_one_active_meeting() {
    // spawn two joins, assert single active meeting row
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml --test rooms_api first_join_creates_meeting_and_attendee`
Expected: FAIL because join/leave routes and lifecycle logic do not exist

- [ ] **Step 3: Write minimal implementation**

```rust
pub async fn join_room(...) -> Result<Json<JoinRoomResponse>, AppError> {
    // load room
    // if active meeting exists, use it
    // else lock room, create Chime meeting, persist active meeting
    // create attendee, persist attendee, return meeting + attendee
}
```

```rust
pub async fn leave_room(...) -> Result<StatusCode, AppError> {
    // mark current user's active attendees as left
    // if active attendee count is zero, mark meeting ended
    // best-effort chime.delete_meeting(active_meeting_id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml --test rooms_api first_join_creates_meeting_and_attendee second_join_reuses_active_meeting last_leave_ends_meeting_and_next_join_recreates_it concurrent_joins_create_only_one_active_meeting`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/rooms backend/src/infra/db/rooms_store.rs backend/src/infra/chime/mod.rs backend/src/app/router.rs backend/tests/rooms_api.rs backend/tests/support/mod.rs
git commit -m "feat(backend): add room join and leave lifecycle"
```

## Chunk 4: Docs And Verification

### Task 7: Align docs with Chime + ECS direction

**Files:**
- Modify: `docs/aws.md`
- Modify: `docs/backend.md`
- Modify: `backend/README.md`
- Modify: `docs/superpowers/specs/2026-04-17-chime-control-plane-design.md`

- [ ] **Step 1: Update docs**

```md
- media plane: Amazon Chime SDK
- compute: ECS
- phase 2: WebSocket + Redis presence
```

- [ ] **Step 2: Verify docs references**

Run: `rg -n "self-hosted WebRTC|coturn|EKS" docs backend/README.md`
Expected: only historical notes remain, no primary guidance conflict

- [ ] **Step 3: Commit**

```bash
git add docs/aws.md docs/backend.md backend/README.md docs/superpowers/specs/2026-04-17-chime-control-plane-design.md
git commit -m "docs: align backend architecture with chime control plane"
```

### Task 8: Final verification

**Files:**
- Test only

- [ ] **Step 1: Format**

Run: `cargo fmt --manifest-path backend/Cargo.toml --check`
Expected: PASS

- [ ] **Step 2: Run tests**

Run: `cargo test --manifest-path backend/Cargo.toml`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `cargo clippy --all-targets --manifest-path backend/Cargo.toml`
Expected: PASS

- [ ] **Step 4: Optional local smoke**

Run: `docker compose up --build`
Expected: app and postgres boot; `/health` and room API reachable

- [ ] **Step 5: Report gaps**

If AWS credentials or Cognito setup are absent, report that Chime/Cognito live smoke remains unverified and keep fake-backed automated tests green.

## Unresolved Questions

- None blocking
- Nice-to-confirm later: JWT を backend で常時検証し続けるか、将来 ALB/OIDC へ寄せるか
- Nice-to-confirm later: `leave` を `room_id` のみで維持するか、将来 `attendee_id` を body に含めるか
