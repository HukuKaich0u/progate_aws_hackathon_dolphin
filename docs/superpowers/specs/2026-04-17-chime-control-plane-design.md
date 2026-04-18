# Chime Control Plane Design

**Date:** 2026-04-17

## Goal

Rust backend で Discord 的な常設 room を管理し、`Amazon Chime SDK` を media plane として使う通話 control plane を設計する。

初回実装は `Cognito` 認証済みユーザー向けの HTTP API に絞り、room 作成、room 参加、meeting 自動生成、attendee 発行、meeting 終了までを扱う。

## Product Model

- `room` は永続化される空間
- `room` は UUID で識別する
- `room` は再利用可能
- `1 room` が同時に持てる `active meeting` は最大 `1` つ
- active meeting がない room に `join` が来たら、新しい `Chime meeting` を自動作成する
- 全員が抜けたら active meeting は終了する
- meeting が終了しても room 自体は残る
- room URL を知っている認証済みユーザーは誰でも参加できる

## Architecture

- control plane は単一 Rust API サービスで開始する
- Web は `axum`
- DB は `PostgreSQL + sqlx`
- media plane は `Amazon Chime SDK`
- 認証は `Cognito`
- ログとメトリクスは `CloudWatch Logs / Metrics`
- 実行基盤は `ECS`
- 初回は stateless HTTP API に絞り、後続で `WebSocket + ElastiCache for Redis / Valkey` を追加する

## System Boundaries

Rust backend が担当するもの:

- room 永続化
- active meeting の解決
- Chime meeting / attendee 作成
- join / leave の正本管理
- 認可
- 構造化ログとアプリケーションメトリクス

Chime に委譲するもの:

- WebRTC 接続
- NAT traversal
- 音声映像配信
- 通話品質制御

## Data Model

### `rooms`

- `id uuid primary key`
- `name text not null`
- `created_by text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `meetings`

- `id uuid primary key`
- `room_id uuid not null`
- `chime_meeting_id text not null`
- `external_meeting_id text not null`
- `status text not null`
- `started_at timestamptz not null`
- `ended_at timestamptz null`

Constraints:

- `status` は `active | ended`
- 同一 `room_id` に対して `status = active` は高々 1 件

### `meeting_attendees`

- `id uuid primary key`
- `meeting_id uuid not null`
- `user_id text not null`
- `chime_attendee_id text not null`
- `joined_at timestamptz not null`
- `left_at timestamptz null`

Notes:

- Chime の `join token` は DB に平文保存しない
- `meeting_attendees` は次フェーズの presence 設計でも正本として使う

## API Surface

### `POST /v1/rooms`

- room を作成する
- response: `room_id`, `name`, `created_at`

### `GET /v1/rooms/:room_id`

- room の基本情報を返す
- active meeting の有無も返す

### `POST /v1/rooms/:room_id/join`

- active meeting があれば既存 meeting を使う
- active meeting がなければ新規 meeting を作る
- caller 用の attendee を発行する
- response: room 情報、meeting 情報、attendee 情報

### `POST /v1/rooms/:room_id/leave`

- caller の attendee を leave 扱いにする
- active attendee が 0 人なら meeting を `ended` にする
- 冪等に扱う

## Lifecycle

1. user が room を作る
2. room は DB に永続化される
3. 最初の `join` で active meeting がなければ Chime meeting を作る
4. join のたびに attendee を発行する
5. leave のたびに active attendee 数を減らす
6. 最後の attendee が抜けたら meeting を終了する
7. 次の `join` で新しい active meeting を再作成する

## Concurrency and Failure Handling

- `join` は active meeting 解決を DB トランザクションで行う
- 同時 `join` が来ても active meeting は 1 つだけ作る
- Chime meeting 作成失敗時は active meeting を残さない
- `leave` は二重送信されても成功扱いにする
- meeting 終了は `meeting_attendees.left_at is null` の件数を正本として判定する

## Phase Scope

### Phase 1: HTTP Control Plane

含めるもの:

- room / meeting / attendee の永続化
- Cognito 認証済みユーザー向け HTTP API
- Chime meeting / attendee 作成
- join / leave lifecycle
- 最小構造化ログ
- 単体テストと最低限の integration test

含めないもの:

- WebSocket signaling
- Redis presence
- mute / hand raise / realtime state sync
- 通知
- フロントエンド実装
- IaC の本格整備

### Phase 2: Realtime State

- WebSocket endpoint
- Redis pub/sub or state fan-out
- presence
- mute 状態
- hand raise などの room state

### Phase 3: Production Hardening

- ECS deploy hardening
- ALB WebSocket tuning
- CloudFront / Route53 / ACM integration
- CloudWatch dashboard / alarms
- 運用メトリクス整理

## Observability

- 全 request に `request_id` を付与する
- room 関連ログに `room_id`, `meeting_id`, `user_id` を含める
- 主要イベントとして `room_created`, `meeting_started`, `meeting_ended`, `attendee_joined`, `attendee_left` を出す
- Phase 1 では CloudWatch Logs を優先し、メトリクスは最低限に留める

## Testing

- room lifecycle の usecase は unit test で押さえる
- HTTP handler は router test で押さえる
- DB 制約と meeting 自動生成は integration test で押さえる
- `join` 同時実行時に active meeting が 1 つだけになることを確認する

## Notes

- 初回は既存 scaffold に合わせて `sqlx` を継続する
- `room` と `meeting` を分けることで、Phase 2 以降の WebSocket / Redis 追加余地を残す
- media plane を Chime に寄せるのは Rust を諦めるためではなく、高リスク部分だけ managed service に逃がすため
