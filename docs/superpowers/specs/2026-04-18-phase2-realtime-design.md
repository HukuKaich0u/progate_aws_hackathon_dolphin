# Phase 2 Realtime Design

**Date:** 2026-04-18

## Goal

Phase 2 では、永続 room に対して `WebSocket` ベースの realtime channel を追加し、`presence` と `self mute state` を同期する。

Phase 1 の HTTP control plane はそのまま維持し、meeting lifecycle の正本は引き続き `PostgreSQL` に置く。Phase 2 の責務は「画面上で即時に見える room state」を `Redis + WebSocket` で配信することに限定する。

## Product Scope

- 対象 room は Phase 1 と同じ永続 room
- WebSocket 接続できるのは `HTTP /join` 済みの認証済みユーザーだけ
- 同期する realtime state は次の 2 つだけ
  - `presence`
  - `self mute`
- `mute` は自分自身の状態だけ変更できる
- moderator による他人の mute 制御は含めない

## Non Goals

- Chime signaling の代替
- meeting の開始 / 終了判定
- hand raise
- moderator controls
- durable event stream
- 通話品質イベント連携

## State Ownership

### PostgreSQL

正本:

- room
- active meeting
- attendee join / leave

HTTP API:

- `POST /v1/rooms/:room_id/join`
- `POST /v1/rooms/:room_id/leave`

### Redis

短命 realtime state:

- 誰が control-channel 上で見えているか
- 誰が mute 状態か
- room 内 broadcast 用 event

### WebSocket

- room state の購読
- `mute.set` の受付
- Redis event の fan-out

WebSocket 自体は meeting を開始しない。meeting 終了判定も持たない。

## Admission Rules

WebSocket endpoint:

- `GET /v1/ws/rooms/:room_id`

接続条件:

- `Authorization: Bearer <token>` が有効
- DB 上で、その user がその room の active meeting に対して `left_at is null` の attendee を持つ

この判定に落ちた場合は WebSocket upgrade を拒否する。

## Redis Model

最小構成では次の 3 つを使う。

- `room:{room_id}:presence`
  - hash
  - `field = user_id`
  - `value = {"user_id":"...","joined_at":"..."}`
- `room:{room_id}:mute`
  - hash
  - `field = user_id`
  - `value = true | false`
- `room:{room_id}:events`
  - pub/sub channel

`presence` と `mute` は snapshot 用、`events` は push 通知用に使う。

## Event Model

すべて JSON message とする。

### Client -> Server

#### `mute.set`

```json
{
  "type": "mute.set",
  "muted": true
}
```

意味:

- caller 自身の mute state を更新する

制約:

- 自分以外の user_id は受け取らない

### Server -> Client

#### `snapshot`

接続直後に返す room 全体の現在状態。

```json
{
  "type": "snapshot",
  "room_id": "<uuid>",
  "participants": [
    {
      "user_id": "user-123",
      "present": true,
      "muted": false
    }
  ]
}
```

#### `presence.joined`

```json
{
  "type": "presence.joined",
  "room_id": "<uuid>",
  "user_id": "user-123"
}
```

#### `presence.left`

```json
{
  "type": "presence.left",
  "room_id": "<uuid>",
  "user_id": "user-123"
}
```

#### `mute.updated`

```json
{
  "type": "mute.updated",
  "room_id": "<uuid>",
  "user_id": "user-123",
  "muted": true
}
```

#### `error`

```json
{
  "type": "error",
  "code": "bad_request"
}
```

## Lifecycle

### Connect

1. client は先に `POST /v1/rooms/:room_id/join` を済ませる
2. client は `GET /v1/ws/rooms/:room_id` に bearer token 付きで接続する
3. backend は Cognito token を検証する
4. backend は DB 上で active attendee を確認する
5. backend は Redis `presence` に caller を載せる
6. backend は Redis から snapshot を組み立てて caller へ返す
7. backend は `presence.joined` を channel に publish する

### Mute Update

1. client が `mute.set` を送る
2. backend は caller 自身の mute state だけ更新する
3. backend は Redis `mute` を更新する
4. backend は `mute.updated` を channel に publish する

### Disconnect

1. WebSocket が切断される
2. backend は Redis `presence` から caller を削除する
3. backend は `presence.left` を channel に publish する

### HTTP Leave

1. client が `POST /v1/rooms/:room_id/leave` を呼ぶ
2. backend は DB 正本を更新する
3. 最後の attendee なら meeting を終了する
4. backend は best-effort で Redis `presence` と `mute` から caller を掃除する

## Consistency Model

- meeting lifecycle の正本は DB
- realtime UI state の正本は Redis
- WebSocket 切断だけでは meeting を終了しない
- `leave` が来たら DB と Redis の両方を掃除する

Phase 2 の presence は「control-channel 上で今見えている user」を表す。Chime media 接続の絶対真実とは切り分ける。

## Initial Assumptions

- scaffold 段階では `1 user per room` あたり `1 active control-channel connection` を前提にする
- multi-device / multi-tab の厳密サポートは後続で扱う
- Redis reconnect や subscription 再確立は最初の最小実装では厚く持たない

## Backend Structure

最小構成では次の責務に分ける。

- `features/realtime`
  - WebSocket handler
  - inbound / outbound DTO
  - connection usecase
- `infra/realtime`
  - Redis access
  - publish / subscribe
  - presence / mute repository
- `features/auth`
  - 既存 bearer auth を再利用
- `features/rooms`
  - join 済み判定に既存 store を使う

## Suggested API Surface

- `GET /v1/ws/rooms/:room_id`

既存 API の変更:

- `POST /v1/rooms/:room_id/leave`
  - Redis state cleanup を追加

## Observability

realtime 関連ログには次を含める。

- `request_id`
- `room_id`
- `user_id`
- `event_type`

主要イベント:

- `ws_connected`
- `ws_rejected`
- `presence_joined`
- `presence_left`
- `mute_updated`

## Testing

最低限の確認対象:

- join 済みでない user は WebSocket 接続できない
- 接続直後に `snapshot` を返す
- 2 クライアント接続時に `presence.joined` が broadcast される
- `mute.set` が `mute.updated` を broadcast する
- `leave` で Redis state が掃除される

## Rollout Notes

- 最初は `presence + self mute` に限定する
- hand raise や moderator action は同じ event 枠組みに後から追加する
- ECS / ALB / Redis を前提にするため、in-memory 実装は採用しない
