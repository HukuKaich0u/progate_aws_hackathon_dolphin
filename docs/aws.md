# AWS 技術方針

## 概要

このプロダクトは、通話基盤そのものは `自前 WebRTC` を採用しつつ、アプリ基盤、データ基盤、ML 基盤、監視基盤は AWS を最大限活用する前提で設計します。

構成図は [voice-matching-aws-architecture.drawio](/Users/KokiAoyagi/Documents/repos/progate_aws_hackathon_dolphin/docs/voice-matching-aws-architecture.drawio) を参照してください。

## 基本方針

- 通話制御は Rust で持つ
- メディア接続は WebRTC で処理する
- インフラ運用、保存、監視、ML 実行基盤は AWS に寄せる
- 将来のスケールに備えて、同期 API と非同期イベント処理を分離する

## 主要サービス

### エッジと公開入口

- `CloudFront`
- `AWS WAF`
- `ALB` または `API Gateway`

`CloudFront` は Web 配信と外部入口を担当します。`WAF` で基本的な防御を行い、API と WebSocket の入口として `ALB` もしくは `API Gateway` を使います。

### 実行基盤

- `Amazon EKS`

Rust の API、signaling、matchmaking、event collector、Python の推論サービスをまとめて運用しやすいため、基本は `EKS` を推奨します。

### リアルタイム通話周辺

- `coturn`
- `Elastic IP` が必要な構成

自前 WebRTC では STUN/TURN が重要です。TURN は EKS、ECS、EC2 のいずれかに載せられますが、運用のしやすさとネットワーク制御を見ながら決めます。

### データ保存

- `Aurora PostgreSQL`
- `ElastiCache for Redis`
- `Amazon S3`

`Aurora PostgreSQL` は主データベースです。`Redis` は presence や signaling 状態など短命データに使います。`S3` は音声ファイル、学習データ、モデル成果物の保存に使います。

### ベクトル検索

- 初期: `Aurora PostgreSQL + pgvector`
- 将来: `OpenSearch Service vector engine`

まずは Aurora に寄せて構成を簡素化し、規模や要件が増えた段階で専用検索基盤に切り出す方針です。

### イベント基盤

- `EventBridge`
- 必要に応じて `Amazon MSK`

最初は `EventBridge` を中心にし、イベント量やストリーム処理要件が増えたら `MSK` を検討します。

### ML / MLOps

- `SageMaker`
- `SageMaker Pipelines`
- `Step Functions`
- `managed MLflow`

学習、評価、モデル登録、推論配備、バッチ処理までを AWS 側に寄せる構成です。

### 監視とセキュリティ

- `CloudWatch`
- `OpenTelemetry`
- `Secrets Manager`
- `KMS`
- `IAM`

## 想定データフロー

### 通常 API

クライアントは `CloudFront` と `ALB` を経由して Rust API に到達します。Rust API は `Aurora`、`Redis`、`S3` を利用します。

### 通話開始

クライアントは signaling service と WebSocket で接続し、SDP/ICE を交換します。NAT 越えには `coturn` を使います。

### 音声アップロード後

音声は `S3` に保存され、イベントが発火されます。後続で前処理、埋め込み生成、文字起こし、特徴量更新、推薦更新を進めます。

### 学習と推論

学習データは `S3` に集約し、`SageMaker` で学習と評価を行います。オンライン推論結果は Rust バックエンドから Python 推論サービス経由で利用します。

## 初期構成の推奨

- `CloudFront`
- `ALB`
- `EKS`
- `Aurora PostgreSQL`
- `ElastiCache Redis`
- `S3`
- `coturn`
- `SageMaker`
- `CloudWatch`

この構成で、アプリ、通話、ML、保存、監視までを一通りカバーできます。

## 将来的な拡張候補

- `OpenSearch Service` へのベクトル検索分離
- `MSK` による高スループットイベント処理
- `Athena` や `Glue` を使った分析強化
- `Lake Formation` を含むデータガバナンス強化

## 注意点

AWS を最大限使う方針でも、通話基盤を完全 managed に寄せるわけではありません。今回の前提では、RTC の中心制御はあくまで自前 Rust / WebRTC 側に残ります。
