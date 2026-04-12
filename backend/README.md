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

2. Docker Compose で起動する

```bash
docker compose up --build
```

3. ヘルスチェックを叩く

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

## Development

- フォーマット: `cargo fmt --manifest-path backend/Cargo.toml`
- テスト: `cargo test --manifest-path backend/Cargo.toml`
- 型チェック: `cargo check --manifest-path backend/Cargo.toml`

## Layout

- `src/app`: 起動、router、state
- `src/features/health`: 最小縦スライス
- `src/infra/db`: Postgres 接続
- `migrations/`: `sqlx` migration 用
