# Frontend Handoff

## Purpose

このドキュメントは、`デザイナー` と `React / Next.js 実装担当` に渡すための handoff です。

対象は次の 3 つです。

- 必要な `ページ`
- 必要な `UI コンポーネント`
- `backend API` と `Cognito` の接続点

前提:

- アプリは `認証後 SPA 体験` を重視する
- 実装は `Next.js` を使う
- 認証は `Cognito Hosted UI + PKCE`
- API は Rust backend の `Bearer token` 保護 route を使う
- room 体験は `1対1中心` ではなく、`room + participants[]` モデルで作る

## Product Shape

体験の主語は `room` です。

- 左サイドバー中心の `Discord shell` ではなく、`room-centered` UI を優先する
- `1対1` は特殊扱いしない
- `複数人 room` を前提にした stage / strip / grid 構成にする
- 初回の room 画面では `chat` と `member list` の右ペインは持たない

## Recommended Next.js Structure

`App Router` 前提の推奨構成です。

```text
app/
  page.tsx
  login/page.tsx
  auth/callback/page.tsx
  rooms/[roomId]/page.tsx
  layout.tsx

features/
  auth/
  room/
  call/
  home/

components/
  ui/
```

責務分離:

- `Server Components`
  静的レイアウト、メタ情報、URL から決まる薄い page shell
- `Client Components`
  `Cognito redirect`, `MediaDevices`, `WebRTC / Chime`, call control, optimistic UI

実務上は `room page` と `auth callback` は `client component` 主体になる想定です。

## Pages

### 1. `/`

目的:

- 入口導線
- サインイン導線
- demo room 導線

必要要素:

- product hero
- `Sign in with Cognito`
- `Open demo room`
- 短い説明文

デザイナー向けメモ:

- LP ではなく `プロダクト入口` として扱う
- SEO よりも、ログイン前の迷わなさを優先する

### 2. `/login`

目的:

- `Cognito Hosted UI` へ遷移する前の認証入口

必要要素:

- サインイン説明
- `Continue with Cognito` CTA
- 必要なら redirect 先の説明

UI メモ:

- 独立した login screen だが、複雑なフォームは不要
- credential 入力は自前では持たない

### 3. `/auth/callback`

目的:

- `code + state` を受けて token exchange
- 成功時に元の page へ戻す

必要要素:

- loading state
- error state

UI メモ:

- 常設ページではなく `processing screen`
- 「サインイン中」「失敗したら再試行」の 2 状態で十分

### 4. `/rooms/[roomId]`

目的:

- room 詳細取得
- prejoin
- join
- 通話中 UI
- reconnect / error handling

構成:

- room header
- main stage
- participant strip / participant grid
- prejoin panel
- control bar
- device sheet / modal
- connection banner

UI メモ:

- `12人以上` を見据えた grid / pagination を考える
- 初期実装では `stage + 2x2/strip` でもよいが、データ構造は `participants[]`
- pin / active speaker を later extension できるようにする

## Required UI Components

### App Shell

- `AppHeader`
  auth status, brand, sign out
- `PageShell`
  login / landing 共通の中央寄せコンテナ

### Auth

- `LoginCard`
- `CallbackStatus`
- `SignedInStatus`
- `SignedOutStatus`

### Room

- `RoomHeader`
  room name, connection state, invite action
- `RoomStage`
  pinned participant または active speaker の表示領域
- `ParticipantGrid`
  remote participants
- `ParticipantTile`
  avatar / display name / mic / video / speaking state
- `PrejoinPanel`
  room summary, join CTA, device preview placeholder
- `RoomErrorState`
  `not found`, `access denied`, `join failed`, `temporary error`
- `ConnectionBanner`
  reconnecting / failed / joining の状態表示
- `ControlBar`
  mic, camera, share screen, devices, leave
- `DeviceSheet`
  audio input, audio output, video input

### Design Tokens

最低限必要:

- surface background
- stage background
- border / divider
- primary CTA
- status colors
  `success`, `warning`, `danger`, `info`
- spacing scale
- type scale
- radius scale

## State Model

### Server State

`TanStack Query` 相当の責務。
`Next.js` に寄せても、room data と current user は client cache を持つ方が扱いやすいです。

- `currentUser`
- `room detail`
- `join room mutation`
- `leave room mutation`

### UI State

`Zustand` 相当の責務。
サーバーレスポンスは入れず、`ユーザー意図` と `通話 UI 状態` を持つ。

- `connectionPhase`
- `isMicEnabled`
- `isCameraEnabled`
- `isScreenSharing`
- `selectedAudioInputId`
- `selectedAudioOutputId`
- `selectedVideoInputId`
- `pinnedParticipantId`
- `participantPage`
- `isDeviceSettingsOpen`

### Media / Call Side Effects

ここは store と分離する。

- `MediaStream`
- `MediaStreamTrack`
- `getUserMedia`
- device switching
- screen share
- `WebRTC / Chime session`

重要:

- store に `MediaStream` は持たない
- store は `isMicEnabled` を持つ
- 実際に `track.enabled = false` を行うのは media layer

## Backend API Mapping

現状の backend route は次です。

### `GET /v1/auth/me`

用途:

- signed-in user の確立

認証:

- `Authorization: Bearer <access token>`

response:

```json
{
  "user_id": "user-123",
  "email": null,
  "groups": []
}
```

frontend use:

- root shell の signed-in / signed-out 判定
- user badge / profile 表示

### `POST /v1/rooms`

用途:

- room 作成

request:

```json
{
  "name": "General"
}
```

response:

```json
{
  "room_id": "uuid",
  "name": "General"
}
```

frontend use:

- room 作成導線を後で足す場合に利用

### `GET /v1/rooms/{room_id}`

用途:

- room detail 取得

response:

```json
{
  "room_id": "uuid",
  "name": "General",
  "has_active_meeting": false
}
```

frontend use:

- room header
- prejoin panel
- empty/live 状態

### `POST /v1/rooms/{room_id}/join`

用途:

- meeting join token の取得

response:

```json
{
  "room_id": "uuid",
  "meeting_id": "meeting-id",
  "external_meeting_id": "external-id",
  "attendee_id": "attendee-id",
  "join_token": "token"
}
```

frontend use:

- join mutation
- meeting session 初期化

### `POST /v1/rooms/{room_id}/leave`

用途:

- leave 処理

response:

- `204 No Content`

frontend use:

- 明示 leave
- page unload / disconnect cleanup

## Cognito Mapping

### Flow

1. user opens protected page
2. app sends user to `Cognito Hosted UI`
3. callback receives `code + state`
4. app exchanges code at `/oauth2/token`
5. app stores `access_token`, `id_token`, `refresh_token`
6. app calls backend with `Bearer access_token`
7. on expiry, app refreshes with `refresh_token`

### Required Env

Next.js では public env 名を再設計してよいですが、必要な値は同じです。

- `API_BASE_URL`
- `COGNITO_CLIENT_ID`
- `COGNITO_DOMAIN`
- `COGNITO_REDIRECT_URI`
- `COGNITO_LOGOUT_REDIRECT_URI`

### Hosted UI Endpoints

- authorize:
  `https://<cognito-domain>/oauth2/authorize`
- token:
  `https://<cognito-domain>/oauth2/token`
- logout:
  `https://<cognito-domain>/logout`

### Frontend Responsibilities

- login start
  `code_verifier`, `state`, redirect target を保持
- callback completion
  code exchange, state validation
- session persistence
  memory-first + browser session persistence
- refresh
  expired access token の再取得
- logout
  local session clear + Hosted UI logout redirect

### Designer Notes

デザイナーが考慮すべき auth state:

- signed out
- signing in
- sign-in failed
- signed in
- session restoring
- session expired

## Error States To Design

最低限必要な UI state:

- `not signed in`
- `checking session`
- `sign-in failed`
- `room loading`
- `room not found`
- `access denied`
- `temporary error`
- `join failed`
- `connecting`
- `connected`
- `reconnecting`
- `leaving`

重要:

- `join API success` と `media connected` は別状態
- `reconnecting` では room scene を消さない

## What Is Still Stubbed Today

今の repo で frontend 側が未接続なのは次です。

- `getRoom`
  まだ stub response
- `joinRoom`
  まだ no-op
- `leaveRoom`
  まだ no-op
- participant list / active speaker / pin
  まだ UI placeholder
- invite flow
  未実装
- room create flow
  未実装

つまり、handoff の時点では `API contract はあるが room data 接続は未完` と共有するのが正しいです。

## Implementation Guidance For Next.js

- route protection は middleware ではなく client-side session 判定から始めてよい
- `auth callback` は `use client` で実装する
- `room page` も当面は `use client` でよい
- `TanStack Query` と同等の cache layer を残す
- `Zustand` は call UI state のみに限定する
- `shadcn/ui` を使う場合も、room stage は独自 UI を優先する
- `App Router` の page/layout で shell を作り、call controller は feature 層に閉じる

## Suggested First Delivery For Design

デザイナーに最初に依頼したい範囲:

- `/`
- `/login`
- `/auth/callback`
- `/rooms/[roomId]` prejoin state
- `/rooms/[roomId]` in-call state
- `not found / denied / join failed / reconnecting`

この範囲が固まれば、React 担当は API と Cognito をつなぎながら実装を進めやすいです。
