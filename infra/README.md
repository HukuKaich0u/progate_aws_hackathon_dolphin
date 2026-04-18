# infra

Terraform で AWS リソースを管理します。設計方針は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 構成

- `modules/` — 再利用単位 (network, cognito, rds, ecr, ecs_backend, ec2_ml)
- `environment/dev/` — 開発環境 (最初に apply する場所)

## Phase 1 で作るもの

- VPC (2AZ, public + private subnets, NAT Gateway)
- Cognito User Pool + backend 用 App Client
- RDS PostgreSQL (private subnet)
- backend 用 ECR repo
- Fargate cluster + ALB + task role (Chime 権限付き)
- ML チーム向け GPU EC2 (既定 `g5.2xlarge`)

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
```

## tfstate

Phase 1 はローカル state です。複数人で apply する前に S3 backend へ移行します
(`environment/dev/backend.tf` にコメントアウト済みのテンプレあり)。

## 破棄

```bash
cd infra/environment/dev
terraform destroy
```

RDS の `deletion_protection` を `false` にしてから destroy します (dev 既定は false)。
