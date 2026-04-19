# infra

Terraform で AWS リソースを管理します。設計方針は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 構成

- `modules/` — 再利用単位 (network, cognito, rds, ecr, ecs_backend, ec2_ml)
- `environment/dev/` — 開発環境 (最初に apply する場所)

## Phase 1 で作るもの

- VPC (2AZ, public + private subnets, NAT Gateway)
- Cognito User Pool + backend 用 App Client
- Cognito frontend App Client + Hosted UI domain
- RDS PostgreSQL (private subnet)
- backend 用 ECR repo
- Fargate cluster + ALB + task role (Chime 権限付き)
- ML チーム向け GPU EC2 (既定 `g5.2xlarge`)
- Amplify Hosting app + `feat-amplify` branch

## 使い方 (dev)

```bash
cd infra/environment/dev

# 1. 秘匿値を埋める
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars

# 2. 初期化
terraform init

# 3. plan
terraform plan -out tf.plan

# 4. apply
terraform apply tf.plan
```

### frontend / Amplify の前提

`terraform.tfvars` に以下を設定します。

- `frontend_branch_name` — Amplify で作る branch 名
- `frontend_base_url` — frontend の公開 URL
- `frontend_api_base_url` — frontend から叩く HTTPS の API URL
- `frontend_cognito_domain_prefix` — Cognito Hosted UI 用の一意な domain prefix

`frontend_base_url` を Amplify の default domain にしたい場合、初回 apply 前には app id が未確定です。
その場合は一旦仮の URL で apply し、出力された `frontend_amplify_branch_url` を `frontend_base_url` に反映してもう一度 `terraform apply` してください。Cognito callback/logout URL と frontend build env が揃います。

Amplify は HTTPS 配信です。`frontend_api_base_url` に HTTP endpoint を渡すと browser の mixed content で API 呼び出しが失敗します。backend をそのまま使うなら HTTPS endpoint を別途用意してください。

### 初回 apply のコツ

`backend_container_image` は ECR push 後の image URI を要求します。卵と鶏になるので:

1. まず `module.ecr_backend` だけ apply する
   ```bash
   terraform apply -target=module.ecr_backend
   ```
2. その repo に backend image を push する
   ```bash
   aws ecr get-login-password --region ap-northeast-1 \
     | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-northeast-1.amazonaws.com
   docker build -t dolphin-dev/backend:latest -f backend/Dockerfile .
   docker tag dolphin-dev/backend:latest <account>.dkr.ecr.ap-northeast-1.amazonaws.com/dolphin-dev/backend:latest
   docker push <account>.dkr.ecr.ap-northeast-1.amazonaws.com/dolphin-dev/backend:latest
   ```
3. `terraform.tfvars` の `backend_container_image` をその URI に書き換える
4. `terraform apply` をフル実行する

### backend チームに渡す値

apply 完了後、以下を取得して共有してください。

```bash
terraform output aws_region
terraform output chime_media_region
terraform output cognito_user_pool_id
terraform output cognito_client_id
terraform output backend_alb_dns_name
terraform output backend_task_role_arn
terraform output -raw database_url      # 秘匿: 個別に渡す
terraform output cognito_frontend_client_id
terraform output cognito_frontend_domain
terraform output frontend_amplify_app_id
terraform output frontend_amplify_branch_url
```

### Amplify app をコンソールで接続

`terraform apply` 後、Amplify Console で作成済み app を開いて repo 接続を行います。

1. Amplify app を開く
2. Git provider を接続する
3. `feat-amplify` branch を選ぶ
4. build 設定は Terraform 側の build spec を使う

接続後のビルドでは `frontend/` の Vite app が `npm ci && npm run build` で公開されます。

## tfstate

Phase 1 はローカル state です。複数人で apply する前に S3 backend へ移行します
(`environment/dev/backend.tf` にコメントアウト済みのテンプレあり)。

## 破棄

```bash
cd infra/environment/dev
terraform destroy
```

RDS の `deletion_protection` を `false` にしてから destroy します (dev 既定は false)。
