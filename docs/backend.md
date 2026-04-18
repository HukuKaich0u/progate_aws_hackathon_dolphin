# バックエンド技術方針

## 概要

バックエンドは `Rust` を主軸にし、認証後の業務 API と通話 control plane を担当します。

このプロダクトでは media plane を `Amazon Chime SDK` に委譲し、backend は room、meeting lifecycle、attendee 発行、presence、イベント収集を担当します。

## 推奨スタック

- `Rust`
- `axum`
- `tokio`
- `serde`
- `sqlx`
- `PostgreSQL`
- `Redis`
- `tracing`
- `CloudWatch Logs / Metrics`

## バックエンドの主要責務

### 業務 API

- ユーザー関連 API
- room 管理
- 通話履歴やイベントの管理

### 通話 control plane

- room 作成
- active meeting 解決
- `Chime meeting` 作成
- `Chime attendee` 発行
- join / leave lifecycle 管理

### リアルタイム制御

- `GET /v1/ws/rooms/:room_id` の WebSocket 接続
- join 済みユーザーだけを通す admission
- presence 管理
- self mute の room state 同期
- `Redis` を使った fan-out

## 想定コンポーネント

### API Service

認証後の通常 API と room / meeting lifecycle を担当します。Phase 1 では `create room`, `get room`, `join room`, `leave room` の HTTP API を実装します。

### Realtime Gateway

Phase 2 で WebSocket を受け、presence と self mute のリアルタイム同期を担当します。meeting lifecycle 自体は引き続き HTTP `join/leave` が正本です。

### Event Collector

通話イベント、推薦ログ、品質指標、モデレーションイベントを収集し、後段の分析や ML パイプラインに流します。

## データストア

### PostgreSQL

正本データを保存します。

- room
- meeting
- meeting_attendees
- 将来の履歴や通報データ

### Redis

短命データを扱います。

- presence
- WebSocket 配信用の room state
- self mute state
- 一時セッション

### S3

将来の音声ファイル、前処理成果物、学習用データ、モデル成果物の保存先です。

## Chime の位置づけ

このプロダクトでは、通話の media plane を `Amazon Chime SDK` で扱います。backend の責務は次です。

- room / meeting 制御
- meeting 作成と終了
- attendee 発行
- 通話イベントの永続化

音声映像転送そのものは Chime の責務に寄せます。

## 設計方針

### 縦スライス優先

機能単位で責務を閉じる構成にします。`auth`, `rooms`, `health` のように feature ごとに handler / usecase / dto / store を分けます。

### 状態遷移を明示

通話系は特に、`room` と `meeting` を分離し、`active` と `ended` を明示的に扱います。暗黙的なフラグの組み合わせで管理しません。

### AWS SDK と外部境界の分離

`Cognito verifier` や `Chime client` は port と adapter を分け、handler / usecase から直接 SDK を呼ばない構成を維持します。
