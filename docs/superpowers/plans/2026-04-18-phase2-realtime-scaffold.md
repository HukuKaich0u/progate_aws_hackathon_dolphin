# Phase 2 Realtime Scaffold Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `backend/` に Redis-backed WebSocket realtime channel を追加し、join 済みユーザー向けの `presence + self mute` 同期を動かす

**Architecture:** Phase 1 の HTTP control plane を正本として維持し、Phase 2 では `features/realtime` を追加する。WebSocket admission は既存 DB を使い、短命 state と fan-out は `infra/realtime` の Redis adapter に寄せる。meeting lifecycle は引き続き HTTP `join/leave` が持ち、WebSocket は realtime UI state のみ扱う。

**Tech Stack:** Rust, axum websocket, tokio, sqlx, redis-rs, PostgreSQL, Redis, serde_json, tracing

---

## Chunk 1: Foundation

### Task 1: Add realtime runtime foundation

**Files:**
- Modify: `backend/Cargo.toml`
- Modify: `backend/src/config.rs`
- Modify: `backend/src/app/state.rs`
- Modify: `backend/src/infra/mod.rs`
- Create: `backend/src/infra/realtime/mod.rs`
- Modify: `backend/src/main.rs`
- Modify: `backend/.env.example`
- Modify: `compose.yaml`
- Test: `backend/src/config.rs`

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn from_env_requires_redis_url() {
    // REDIS_URL missing => AppError::MissingConfig("REDIS_URL")
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml from_env_requires_redis_url`
Expected: FAIL because `AppConfig` does not read `REDIS_URL`

- [ ] **Step 3: Write minimal implementation**

```rust
pub struct AppConfig {
    pub redis_url: String,
}
```

```rust
pub struct AppState {
    pub realtime_store: Arc<dyn RealtimeStore>,
}
```

```rust
pub fn redis_realtime_store(client: redis::Client) -> Arc<dyn RealtimeStore> {
    Arc::new(RedisRealtimeStore::new(client))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml config::tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/Cargo.toml backend/src/config.rs backend/src/app/state.rs backend/src/infra/mod.rs backend/src/infra/realtime/mod.rs backend/src/main.rs backend/.env.example compose.yaml
git commit -m "chore(backend): add realtime runtime foundation"
```

### Task 2: Add DB admission query and realtime port

**Files:**
- Create: `backend/src/features/realtime/mod.rs`
- Create: `backend/src/features/realtime/dto.rs`
- Create: `backend/src/features/realtime/store.rs`
- Create: `backend/src/features/realtime/usecase.rs`
- Modify: `backend/src/features/mod.rs`
- Modify: `backend/src/features/rooms/store.rs`
- Modify: `backend/src/infra/db/rooms_store.rs`
- Modify: `backend/tests/support/mod.rs`
- Test: `backend/src/infra/db/rooms_store.rs`
- Test: `backend/src/features/realtime/usecase.rs`

- [ ] **Step 1: Write the failing tests**

```rust
#[sqlx::test]
async fn has_active_attendee_returns_true_for_joined_user(pool: PgPool) {
    // room -> meeting -> attendee => true
}

#[tokio::test]
async fn ensure_room_membership_rejects_user_without_active_attendee() {
    // usecase should return AppError::Unauthorized
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --manifest-path backend/Cargo.toml has_active_attendee_returns_true_for_joined_user ensure_room_membership_rejects_user_without_active_attendee`
Expected: FAIL because store query and realtime usecase do not exist

- [ ] **Step 3: Write minimal implementation**

```rust
#[async_trait]
pub trait RoomLifecycleStore {
    async fn has_active_attendee(&self, room_id: Uuid, user_id: &str) -> Result<bool, AppError>;
}
```

```rust
#[async_trait]
pub trait RealtimeStore: Send + Sync {
    async fn snapshot(&self, room_id: Uuid) -> Result<RoomSnapshot, AppError>;
    async fn upsert_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn remove_presence(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
    async fn set_mute(&self, room_id: Uuid, user_id: &str, muted: bool) -> Result<(), AppError>;
    async fn remove_mute(&self, room_id: Uuid, user_id: &str) -> Result<(), AppError>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --manifest-path backend/Cargo.toml has_active_attendee_returns_true_for_joined_user ensure_room_membership_rejects_user_without_active_attendee`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/realtime backend/src/features/mod.rs backend/src/features/rooms/store.rs backend/src/infra/db/rooms_store.rs backend/tests/support/mod.rs
git commit -m "feat(backend): add realtime admission port"
```

## Chunk 2: WebSocket Scaffold

### Task 3: Add websocket endpoint with admission and snapshot

**Files:**
- Create: `backend/src/features/realtime/handler.rs`
- Modify: `backend/src/app/router.rs`
- Modify: `backend/src/features/realtime/mod.rs`
- Modify: `backend/tests/support/mod.rs`
- Create: `backend/tests/realtime_ws.rs`

- [ ] **Step 1: Write the failing tests**

```rust
#[tokio::test]
async fn websocket_rejects_user_without_active_attendee() {
    // connect to /v1/ws/rooms/:room_id before join => 401
}

#[tokio::test]
async fn websocket_connect_sends_snapshot() {
    // join first, connect, first frame is snapshot
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --manifest-path backend/Cargo.toml --test realtime_ws websocket_rejects_user_without_active_attendee websocket_connect_sends_snapshot`
Expected: FAIL because ws route and handler do not exist

- [ ] **Step 3: Write minimal implementation**

```rust
pub async fn websocket_room_handler(
    ws: WebSocketUpgrade,
    Path(room_id): Path<Uuid>,
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Response, AppError> {
    usecase::ensure_room_membership(...).await?;
    Ok(ws.on_upgrade(move |socket| handle_socket(socket, state, room_id, user)))
}
```

```rust
async fn handle_socket(...) {
    realtime_store.upsert_presence(...).await?;
    let snapshot = realtime_store.snapshot(room_id).await?;
    socket.send(Message::Text(serde_json::to_string(&snapshot)?.into())).await?;
    realtime_store.remove_presence(...).await?;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --manifest-path backend/Cargo.toml --test realtime_ws websocket_rejects_user_without_active_attendee websocket_connect_sends_snapshot`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/realtime/handler.rs backend/src/app/router.rs backend/tests/realtime_ws.rs backend/tests/support/mod.rs
git commit -m "feat(backend): add websocket snapshot scaffold"
```

### Task 4: Implement Redis-backed realtime store

**Files:**
- Modify: `backend/src/infra/realtime/mod.rs`
- Modify: `backend/src/features/realtime/dto.rs`
- Modify: `backend/tests/support/mod.rs`
- Test: `backend/src/infra/realtime/mod.rs`

- [ ] **Step 1: Write the failing tests**

```rust
#[tokio::test]
async fn redis_store_snapshot_reflects_presence_and_mute() {
    // upsert_presence + set_mute => snapshot contains participant
}

#[tokio::test]
async fn redis_store_remove_presence_keeps_mute_default_false() {
    // disconnect => not present in snapshot
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --manifest-path backend/Cargo.toml redis_store_snapshot_reflects_presence_and_mute`
Expected: FAIL because RedisRealtimeStore methods are not implemented

- [ ] **Step 3: Write minimal implementation**

```rust
let presence_key = format!("room:{room_id}:presence");
let mute_key = format!("room:{room_id}:mute");
```

```rust
conn.hset(&presence_key, user_id, presence_json).await?;
conn.hset(&mute_key, user_id, muted).await?;
```

```rust
pub struct RoomSnapshot {
    pub participants: Vec<ParticipantSnapshot>,
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --manifest-path backend/Cargo.toml redis_store_snapshot_reflects_presence_and_mute redis_store_remove_presence_keeps_mute_default_false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/infra/realtime/mod.rs backend/src/features/realtime/dto.rs backend/tests/support/mod.rs
git commit -m "feat(backend): add redis realtime store"
```

## Chunk 3: Fan-out And Cleanup

### Task 5: Add pub/sub fan-out and self mute updates

**Files:**
- Modify: `backend/src/features/realtime/dto.rs`
- Modify: `backend/src/features/realtime/store.rs`
- Modify: `backend/src/features/realtime/usecase.rs`
- Modify: `backend/src/features/realtime/handler.rs`
- Modify: `backend/src/infra/realtime/mod.rs`
- Modify: `backend/tests/realtime_ws.rs`
- Modify: `backend/tests/support/mod.rs`

- [ ] **Step 1: Write the failing tests**

```rust
#[tokio::test]
async fn second_connection_receives_presence_joined_event() {
    // client A connected, client B connects => A receives presence.joined
}

#[tokio::test]
async fn mute_set_broadcasts_mute_updated() {
    // client sends mute.set => peer receives mute.updated
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --manifest-path backend/Cargo.toml --test realtime_ws second_connection_receives_presence_joined_event mute_set_broadcasts_mute_updated`
Expected: FAIL because ws loop does not subscribe/publish events

- [ ] **Step 3: Write minimal implementation**

```rust
pub enum ClientRealtimeEvent {
    MuteSet { muted: bool },
}

pub enum ServerRealtimeEvent {
    Snapshot(RoomSnapshot),
    PresenceJoined { room_id: Uuid, user_id: String },
    PresenceLeft { room_id: Uuid, user_id: String },
    MuteUpdated { room_id: Uuid, user_id: String, muted: bool },
    Error { code: &'static str },
}
```

```rust
tokio::select! {
    Some(msg) = socket.recv() => { /* handle mute.set */ }
    Some(event) = subscription.next() => { /* forward redis event */ }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --manifest-path backend/Cargo.toml --test realtime_ws second_connection_receives_presence_joined_event mute_set_broadcasts_mute_updated`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/realtime backend/src/infra/realtime/mod.rs backend/tests/realtime_ws.rs backend/tests/support/mod.rs
git commit -m "feat(backend): add realtime fanout and mute updates"
```

### Task 6: Cleanup realtime state on HTTP leave

**Files:**
- Modify: `backend/src/features/rooms/usecase.rs`
- Modify: `backend/src/features/rooms/handler.rs`
- Modify: `backend/src/app/state.rs`
- Modify: `backend/src/main.rs`
- Modify: `backend/tests/rooms_api.rs`
- Modify: `backend/tests/support/mod.rs`

- [ ] **Step 1: Write the failing test**

```rust
#[tokio::test]
async fn leave_cleans_up_realtime_presence_and_mute_state() {
    // join + ws connect + mute.set + leave => snapshot empty
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path backend/Cargo.toml --test rooms_api leave_cleans_up_realtime_presence_and_mute_state`
Expected: FAIL because leave path does not touch realtime store

- [ ] **Step 3: Write minimal implementation**

```rust
if let Err(error) = realtime_store.remove_presence(room.id, &user.user_id).await { ... }
if let Err(error) = realtime_store.remove_mute(room.id, &user.user_id).await { ... }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path backend/Cargo.toml --test rooms_api leave_cleans_up_realtime_presence_and_mute_state`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/rooms/usecase.rs backend/src/features/rooms/handler.rs backend/src/app/state.rs backend/src/main.rs backend/tests/rooms_api.rs backend/tests/support/mod.rs
git commit -m "feat(backend): clean realtime state on leave"
```

## Chunk 4: Docs And Verification

### Task 7: Align docs with phase 2 realtime stack

**Files:**
- Modify: `backend/README.md`
- Modify: `docs/backend.md`
- Modify: `docs/aws.md`
- Modify: `docs/aws-setup.md`

- [ ] **Step 1: Update docs**

```md
- websocket endpoint: GET /v1/ws/rooms/:room_id
- realtime state: Redis hash + pub/sub
- scope: presence + self mute only
```

- [ ] **Step 2: Verify docs references**

Run: `rg -n "presence|mute|Redis|WebSocket" backend/README.md docs`
Expected: phase 2 guidance appears in backend and aws docs

- [ ] **Step 3: Commit**

```bash
git add backend/README.md docs/backend.md docs/aws.md docs/aws-setup.md
git commit -m "docs: add phase 2 realtime guidance"
```

### Task 8: Final verification

**Files:**
- Test only

- [ ] **Step 1: Format**

Run: `cargo fmt --manifest-path backend/Cargo.toml --check`
Expected: PASS

- [ ] **Step 2: Run tests**

Run: `export DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/postgres'; export REDIS_URL='redis://127.0.0.1:6379'; cargo test --manifest-path backend/Cargo.toml`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `cargo clippy --all-targets --manifest-path backend/Cargo.toml`
Expected: PASS

- [ ] **Step 4: Optional local smoke**

Run: `docker compose up -d postgres redis && backend/scripts/live_smoke.sh`
Expected: backend + postgres + redis boot; HTTP and websocket scaffold are reachable

- [ ] **Step 5: Report gaps**

If Redis or AWS credentials are absent, report that live websocket smoke remains unverified and keep automated tests green.

## Unresolved Questions

- None blocking
- Nice-to-confirm later: multi-tab を同一 user の 1 presence に潰すか、connection 単位で扱うか
- Nice-to-confirm later: Redis reconnect / resubscribe を Phase 2 でどこまで harden するか
