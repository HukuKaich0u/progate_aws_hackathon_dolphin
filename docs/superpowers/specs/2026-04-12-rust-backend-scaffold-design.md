# Rust Backend Scaffold Design

**Date:** 2026-04-12

## Goal

`backend/` に、`axum + sqlx + PostgreSQL + serde + Docker` を前提にした最小バックエンド scaffold を作る。

業務ドメインは未確定なので、今回の設計は feature-first の拡張しやすい骨組みと、開発開始に必要なインフラ導線の確立に集中する。

## Architecture

- 単一バイナリのモジュラモノリスで開始する
- `src/app` に起動、router、state を置く
- `src/features/health` に最小の縦スライスを置く
- `src/infra/db` に Postgres 接続を置く
- エラーは `thiserror` ベースの `AppError` に寄せる
- JSON の入出力は `serde` を使う

## Scope

今回含めるもの:

- Cargo プロジェクト初期化
- `axum` アプリ起動
- `GET /health`
- `GET /health/db`
- Postgres 接続設定
- `sqlx` migration ディレクトリ
- Dockerfile
- `compose.yaml` による app/postgres 起動
- `.env.example`
- README 更新

今回含めないもの:

- 業務ドメインの feature
- 認証
- 永続化モデル
- repository trait の本格導入
- CI

## Error Handling

- `backend/src/error.rs` に `AppError` を定義する
- `thiserror::Error` を derive する
- `IntoResponse` を実装して HTTP エラーへ変換する
- DB 到達性チェックなどの内部失敗は 500 を返す

## Testing

- `cargo test` でルーティングと health handler の最小テストを通す
- DB 依存の挙動は `docker compose up` + `curl` で検証可能にする

## Notes

- `rust-backend-ai-guidelines.md` の方針に合わせ、trait は過剰導入しない
- API DTO にだけ `serde` を付ける
- まず 1 feature の見本として `health` を作る
