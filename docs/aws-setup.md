# AWS セッティング指示書

## 目的

Rust backend の Phase 2 realtime scaffold を AWS 上で動かし、`Cognito` で認証されたユーザーが `room create -> room join -> Chime meeting / attendee 発行 -> WebSocket presence/self mute` まで通る状態を作る。

このドキュメントは、AWS セットアップを担当する人向けの作業指示書です。backend 実装側が最低限必要としている AWS リソース、設定値、権限、疎通確認項目をまとめます。

## 今回の実装対象

- backend は `Amazon ECS` 上の Rust API
- 認証は `Amazon Cognito User Pool`
- 通話の media plane は `Amazon Chime SDK Meetings`
- ログは `CloudWatch Logs`
- DB は `PostgreSQL`
- realtime 状態共有は `Redis`
- WebSocket は `ALB` で待ち受ける

今回は Phase 2 なので、`Redis` と `ALB WebSocket` は対象に含みます。`CloudFront`, `Route53`, `ACM` は引き続き後回しで構いません。

## 作ってほしいもの

### 1. Cognito User Pool

必要なもの:

- User Pool 1 つ
- backend 用 App Client 1 つ
- テストユーザーを最低 1 人

前提:

- backend は bearer token を受け取り、Cognito の JWT を検証する
- 現在の backend は `access token` と `id token` の両方を受け付ける
- `sub` claim をアプリ内 user_id として使う

共有してほしい値:

- `AWS_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`

テストでほしいもの:

- ログイン可能なテストユーザー
- そのユーザーで取得した `access token` または `id token`

### 2. Chime を呼べる IAM 権限

backend 実行主体に、最低限次の権限を付けてください。

- `chime:CreateMeeting`
- `chime:CreateAttendee`
- `chime:DeleteMeeting`

補足:

- 実装は `aws-sdk-chimesdkmeetings` を使っている
- `join` 時に active meeting がなければ `CreateMeeting`
- 参加時に `CreateAttendee`
- 最後の参加者が抜けたら `DeleteMeeting`

推奨:

- ECS task role に付与
- まずは resource を広めに許可して疎通確認し、その後絞る

### 3. PostgreSQL

必要なもの:

- backend から接続できる PostgreSQL
- current migration を適用できる権限

共有してほしい値:

- `DATABASE_URL`

補足:

- 開発段階では RDS でもローカル Docker でもよい
- AWS 担当が RDS を用意するなら、backend 実行環境から疎通できることを確認してほしい

### 4. ECS 実行環境

必要なもの:

- ECS cluster
- Rust backend 用 service / task definition
- backend コンテナへ環境変数を渡す仕組み
- CloudWatch Logs 出力

backend コンテナに渡す環境変数:

- `APP_HOST=0.0.0.0`
- `APP_PORT=3000`
- `DATABASE_URL`
- `REDIS_URL`
- `AWS_REGION`
- `CHIME_MEDIA_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`

補足:

- `CHIME_MEDIA_REGION` は `AWS_REGION` と同じで構わない
- backend は stateless な HTTP + WebSocket API なので、Phase 2 でも単純な ECS service でよい

## IAM ポリシー例

最初の疎通確認用としては、次のような最小集合で十分です。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:CreateMeeting",
        "chime:CreateAttendee",
        "chime:DeleteMeeting"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

必要に応じて次も検討してください。

- Secrets Manager から `DATABASE_URL` を読む権限
- KMS 復号権限

## backend 側が必要としている設定値

AWS 担当者から backend 側に渡してほしいものは次です。

```env
DATABASE_URL=postgres://...
REDIS_URL=redis://...
AWS_REGION=ap-northeast-1
CHIME_MEDIA_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

加えて、live 疎通のために次のどちらかが必要です。

- Cognito で発行したテスト用 bearer token
- テストユーザーのログイン手順

## 疎通確認チェックリスト

### A. backend 起動確認

- ECS task が起動する
- `/health` が `200`
- `/health/db` が `200`

### B. 認証確認

- Cognito の token 付きで `POST /v1/rooms` が `201`
- token なしでは `401`

### C. Chime 疎通確認

- `POST /v1/rooms/:room_id/join` が `200`
- レスポンスに `meeting_id`, `attendee_id`, `join_token` が含まれる
- CloudWatch Logs に AWS SDK エラーが出ていない

### D. leave 確認

- `POST /v1/rooms/:room_id/leave` が `204`
- 最後の 1 人なら active meeting が終了扱いになる

### E. realtime 確認

- `POST /v1/rooms/:room_id/join` のあとでだけ `GET /v1/ws/rooms/:room_id` が接続できる
- 接続直後に `snapshot` event が返る
- 別クライアント接続時に `presence.joined` が流れる
- `mute.set` で peer に `mute.updated` が流れる

## API 動作確認例

backend 側には live smoke 用に [../backend/scripts/live_smoke.sh](../backend/scripts/live_smoke.sh) と [../backend/scripts/live_smoke.env.example](../backend/scripts/live_smoke.env.example) を置いてあります。`TOKEN` と `BACKEND_URL` を入れれば HTTP 側の確認をまとめて実行できます。

### room 作成

```bash
curl -X POST "$BACKEND_URL/v1/rooms" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"General"}'
```

### room 参加

```bash
curl -X POST "$BACKEND_URL/v1/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $TOKEN"
```

### room 離脱

```bash
curl -X POST "$BACKEND_URL/v1/rooms/$ROOM_ID/leave" \
  -H "Authorization: Bearer $TOKEN"
```

## よくある詰まりどころ

### Cognito token の不一致

- 別リージョンの User Pool を使っている
- `COGNITO_CLIENT_ID` が token の `aud` または `client_id` と一致していない
- access token ではなく無効な token を送っている

### Chime 権限不足

- ECS task role に Chime 権限がない
- task role ではなく execution role にだけ付けている

### DB 接続失敗

- ECS から DB へのネットワーク疎通がない
- migration 未適用

## AWS 担当者からほしい返却物

- `AWS_REGION`
- `CHIME_MEDIA_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `REDIS_URL`
- `DATABASE_URL` または接続先情報
- backend に付与した IAM 権限の概要
- テストユーザーまたは bearer token
- backend の疎通確認 URL

## 次フェーズで追加予定のもの

今回は必須ではないが、次フェーズ以降では次を追加予定です。

- `CloudFront`
- `Route53`
- `ACM`
- CloudWatch alarms / dashboard
