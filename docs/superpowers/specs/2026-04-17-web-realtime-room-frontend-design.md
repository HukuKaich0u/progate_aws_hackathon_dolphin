# Web Realtime Room Frontend Design

**Date:** 2026-04-17

## Goal

`frontend/` に、Discord 的なリアルタイム通話体験へ伸ばせる Web フロントエンドの骨組みを作る。

初回実装は `Cognito` 認証済みユーザー向けの room-centered UI に絞り、`room URL` からの入室、prejoin、join、複数人通話画面、通話コントロール、leave までを扱う。

## Stack

- `Vite`
- `React`
- `TanStack Router`
- `TanStack Query`
- `shadcn/ui`
- `Zustand`

## Product Model

- 主役は `room` であり、初回は `room-centered` UI を採用する
- `1対1` は特別扱いせず、`participants[]` の 2 件ケースとして扱う
- 初回から `3人目以降` の join と表示を許可する
- UI は `12人以上` を想定して設計する
- `chat` と `member list` の右ペインは初回には含めない

## Architecture

- フロントエンドは `SSR` なしの SPA とする
- `TanStack Router` で `public/authenticated room routes` を分ける
- `TanStack Query` は API 状態と mutation を担当する
- `Zustand` は通話 UI 状態とユーザー意図だけを担当する
- `Call Controller / Media Layer` はメディアデバイスと通話セッションの副作用を担当する
- `RoomScene` をアプリシェル非依存の中心コンポーネントとして設計し、後で app shell に載せ替え可能にする

## Route Surface

- `/login`
- `/auth/callback`
- `/rooms/:roomId`

Notes:

- `prejoin` は別 route にせず、`/rooms/:roomId` 内の状態として扱う
- 未認証で room URL を開いた場合は `login -> callback -> room` に復帰する

## Screen Composition

### Room Screen

- `RoomHeader`
- `MainStage`
- `ParticipantStripOrGrid`
- `BottomControlBar`

### Layout Rules

- `pin` 中は pinned participant を `MainStage` に表示する
- `pin` がなければ `active speaker` を `MainStage` に表示する
- 他参加者は `ParticipantStripOrGrid` に表示する
- 参加者増加時は `pagination` を用いて overflow を処理する
- `1対1` のときも同じレイアウト骨格を使う

## State Boundaries

### Server State

`TanStack Query` が担当するもの:

- room 情報取得
- join / leave mutation
- 参加者メタデータ取得
- 認証後ユーザー情報取得

### Session UI State

`Zustand` が担当するもの:

- `isMicEnabled`
- `isCameraEnabled`
- `isScreenSharing`
- `selectedAudioInputId`
- `selectedAudioOutputId`
- `selectedVideoInputId`
- `connectionPhase`
- `pinnedParticipantId`
- `participantPage`
- `isDeviceSettingsOpen`

### Media Side Effects

`Call Controller / Media Layer` が担当するもの:

- `MediaStream`
- `MediaStreamTrack`
- device permission / preview
- device switching
- screen share
- meeting session 初期化
- 接続 / 再接続 / 切断時の副作用

Notes:

- `Zustand` に API キャッシュを入れない
- `Zustand` に `MediaStream` や `RTCPeerConnection` を直接保存しない
- `mic off` などの意図は store に置き、実際の track 制御は media layer が行う

## Participant Model

### Participant View Model

- `id`
- `displayName`
- `avatarUrl`
- `isLocal`
- `audioMuted`
- `videoEnabled`
- `isScreenSharing`
- `isSpeaking`
- `networkQuality`

### Derived UI State

- `stageParticipant`
- `visibleParticipants`
- `overflowParticipants`
- `overflowCount`

## Auth And Join Flow

1. user が `room URL` を開く
2. 未認証なら Router guard が `login` に誘導する
3. `auth/callback` で token を確立する
4. `room` route に戻る
5. room メタデータを取得する
6. device permission / preview を行う
7. `join API` を呼ぶ
8. meeting/session を初期化する
9. `connected` へ遷移する

## Connection Phases

- `idle`
- `authenticating`
- `prejoin`
- `joining`
- `connecting`
- `connected`
- `reconnecting`
- `failed`
- `leaving`

## Failure Handling

- 未認証時は login へ遷移する
- room 取得失敗時は `not found` `access denied` `temporary error` を分けて扱う
- device permission 拒否時は再許可導線を表示する
- `join API` 失敗時は再試行可能にする
- media/session 接続失敗時は `join 済みだが接続失敗` として扱う
- 再接続中は room UI を維持しつつ status banner を表示する
- 明示的 leave と通信断を見た目で区別する

## Phase Scope

### Phase 1

含めるもの:

- SPA scaffold
- Cognito login / callback
- room-centered route
- prejoin
- join / leave
- `participants[]` ベースの通話画面
- `12人以上` を見据えた paging
- mic / camera / share / device controls
- 最小エラー表示

含めないもの:

- app shell
- chat pane
- member list pane
- 通知
- room directory 一覧
- unread / presence の本格同期

### Phase 2

- app shell
- room 一覧
- chat / member list
- WebSocket / realtime room state
- より高度な participant layout

## Testing

- Router guard と callback 復帰を確認する
- `room -> prejoin -> join -> connecting -> connected` の状態遷移を確認する
- mic / camera / device 切替で store と media layer の責務分離を確認する
- `participants[]` から `stage + strip/grid` を導出できることを確認する
- `12人以上` で paging が機能することを確認する
- leave と reconnect 系 UI を確認する

## Notes

- 現時点では `React` の学習コストが低く、総合速度で `SolidJS` より有利と判断する
- `shadcn/ui` は認証や設定などの補助 UI に使い、通話画面コアは独自実装を前提にする
- 将来の app shell 導入に備え、`RoomScene` を単独で成立する構造にする
