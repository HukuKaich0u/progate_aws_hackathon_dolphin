# AWS 技術方針

## 概要

このプロダクトは、通話の `media plane` を `Amazon Chime SDK` に委譲し、アプリケーションの `control plane` を Rust backend で持つ前提で設計します。

バックエンドは room、meeting lifecycle、認証、presence、イベント収集を担当し、公開入口、実行基盤、データ基盤、監視基盤は AWS を中心に構成します。

実際のセットアップ作業を他メンバーに依頼する場合は、[aws-setup.md](./aws-setup.md) を作業指示書として使ってください。

## 基本方針

- room / meeting の制御は Rust で持つ
- 音声映像配信は `Amazon Chime SDK` に委譲する
- 初期構成は `ECS` を前提にする
- `ALB` で HTTP と WebSocket を受ける
- 永続データは `PostgreSQL`
- 短命リアルタイム状態は `ElastiCache for Redis / Valkey`
- 認証は `Cognito`
- 監視は `CloudWatch Logs / Metrics`

## 主要サービス

### エッジと公開入口

- `CloudFront`
- `Route53`
- `ACM`
- `ALB`

`CloudFront` は Web 配信と公開入口を担当します。DNS は `Route53`、証明書は `ACM`、API と WebSocket のオリジンは `ALB` を使います。

### 実行基盤

- `Amazon ECS`

Rust の API コンテナを `ECS` で動かします。Phase 1 は stateless な HTTP control plane なので、水平スケールしやすい構成を優先します。

### リアルタイム通話周辺

- `Amazon Chime SDK`
- `ALB WebSocket`
- `ElastiCache for Redis / Valkey`

`Amazon Chime SDK` は meeting / attendee とメディア配信を担当します。backend は Chime meeting の生成、attendee 発行、room state 制御を担当します。presence や mute 状態などの短命データは `Redis` に寄せます。

### データ保存

- `PostgreSQL`
- `ElastiCache for Redis / Valkey`
- `Amazon S3`

`PostgreSQL` は room、meeting、参加履歴などの正本です。`Redis` は presence や WebSocket fan-out 用に使います。`S3` は将来の音声関連データや ML 資産の保存先です。

### 認証とセキュリティ

- `Amazon Cognito`
- `IAM`
- `Secrets Manager`
- `KMS`

### 監視

- `CloudWatch Logs`
- `CloudWatch Metrics`
- 必要に応じて `OpenTelemetry`

## 想定データフロー

### 通常 API

クライアントは `CloudFront` と `ALB` を経由して Rust API に到達します。Rust API は `PostgreSQL` と `Redis` を利用します。

### 通話参加

クライアントは認証後に backend の `join` API を叩きます。backend は active meeting を解決し、必要なら新しい `Chime meeting` を作成し、caller 用の `attendee` を払い出します。

### リアルタイム状態同期

Phase 2 ではクライアントが `ALB` 経由で `GET /v1/ws/rooms/:room_id` に接続し、presence と self mute を `Redis` で配信します。WebSocket admission は先に HTTP `join` 済みであることが前提です。

## 初期構成の推奨

- `CloudFront`
- `Route53`
- `ACM`
- `ALB`
- `ECS`
- `PostgreSQL`
- `ElastiCache for Redis / Valkey`
- `Amazon Chime SDK`
- `CloudWatch`

## 将来的な拡張候補

- CloudWatch dashboard / alarms の整備
- `EventBridge` による通話イベント連携
- `S3` と `SageMaker` を使った ML パイプライン拡張

## 注意点

Rust で自作するのは control plane です。高リスクな media plane を自前実装しないために `Amazon Chime SDK` を採用します。
