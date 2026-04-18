# Backend

Rust バックエンドはこのディレクトリ配下で実装する想定です。

実装を始める前の設計メモとして、AI コーディングと相性のいいアーキテクチャと技術選定の方針を [`rust-backend-ai-guidelines.md`](./rust-backend-ai-guidelines.md) にまとめています。

## Stack

- Rust
- axum
- sqlx
- PostgreSQL
- serde
- thiserror

## Local setup

1. 環境変数を作成する

```bash
cp backend/.env.example backend/.env
```

最低限、次の設定を埋める想定です。

- `DATABASE_URL`
- `REDIS_URL`
- `AWS_REGION`
- `CHIME_MEDIA_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`

AWS を別担当が用意する場合は、必要な返却物と作業範囲を [../docs/aws-setup.md](../docs/aws-setup.md) にまとめています。

2. Docker Compose で起動する

```bash
make up
```

3. ヘルスチェックを叩く

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

4. room API を叩く

```bash
curl -X POST http://localhost:3000/v1/rooms \
  -H 'Authorization: Bearer dummy-token' \
  -H 'Content-Type: application/json' \
  -d '{"name":"General"}'
```

live 疎通時は `dummy-token` ではなく、Cognito で発行した実 token を使ってください。

5. WebSocket realtime を確認する

`POST /v1/rooms/:room_id/join` のあとにだけ、`GET /v1/ws/rooms/:room_id` へ接続できます。初期実装の realtime scope は `presence + self mute` のみです。

## Development

- 起動: `make up`
- 停止: `make down`
- logs: `make logs`
- フォーマット: `cargo fmt --manifest-path backend/Cargo.toml`
- テスト: `cargo test --manifest-path backend/Cargo.toml`
- 型チェック: `cargo check --manifest-path backend/Cargo.toml`

## Live smoke

AWS 返却後の最小疎通確認は `jq` が入っていれば次で流せます。

```bash
cp backend/scripts/live_smoke.env.example backend/scripts/live_smoke.env
```

`backend/scripts/live_smoke.env` に `TOKEN` を入れたら、次で叩けます。

```bash
set -a
source backend/scripts/live_smoke.env
set +a
backend/scripts/live_smoke.sh
```

この script は `health -> create room -> get room -> join room -> leave room -> get room after leave` を順に叩きます。

`docker compose up --build` でローカル backend を起動する場合も、live smoke に必要な `REDIS_URL`, `AWS_REGION`, `CHIME_MEDIA_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` は `compose.yaml` から渡るようにしてあります。

## Layout

- `src/app`: 起動、router、state
- `src/features/health`: 最小縦スライス
- `src/features/auth`: 認証コンテキストと extractor
- `src/features/rooms`: room / meeting lifecycle
- `src/features/realtime`: WebSocket admission / presence / self mute
- `src/infra/db`: Postgres 接続
- `src/infra/realtime`: Redis hash + pub/sub
- `migrations/`: `sqlx` migration 用
