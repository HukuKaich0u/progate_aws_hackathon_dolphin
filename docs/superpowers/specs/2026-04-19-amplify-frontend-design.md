# Amplify Frontend Design

## Goal

`terraform apply` で Amplify Hosting のアプリ定義を作成し、`frontend/` の Vite アプリを後から Git 連携するだけで載せられる状態にする。

## Scope

- `infra/modules/amplify_frontend` を追加
- `infra/environment/dev` から Amplify module を呼ぶ
- frontend が要求する `VITE_*` を Terraform から注入
- Cognito module に frontend 用 app client / hosted UI domain を追加
- `feat-amplify` branch を Terraform で作成
- frontend API endpoint は `frontend_api_base_url` 入力で明示する

## Non-Goals

- GitHub 接続の自動化
- カスタムドメインの自動化
- Amplify Console 上での初回リポジトリ接続の自動化

## Design

- Amplify app は repo 未接続でも作成する
- build は repo root から `frontend/` に `cd` して `npm ci && npm run build`
- SPA rewrite rule を app 側で定義する
- Cognito callback / logout URL は `frontend_base_url` 入力を使う
- backend API URL は `frontend_api_base_url` をそのまま `VITE_API_BASE_URL` に渡す
- Amplify default domain を使う場合は、初回 apply 後に出力 URL へ `frontend_base_url` を合わせて再 apply できるようにする

## Risks

- Amplify default domain は app 作成後にしか確定しないため、`frontend_base_url` を事前に確定できない場合は Cognito callback URL の再 apply が必要
- Cognito domain prefix はリージョン内で一意である必要がある
- `frontend_api_base_url` が HTTP のままだと Amplify HTTPS 配信から mixed content で失敗する
