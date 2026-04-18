# infra/ 設計方針

このディレクトリは、本プロダクトの AWS インフラを Infrastructure as Code (Terraform) で定義する場所です。
backend / ML / frontend チームから依頼された AWS リソースをここに集約します。

このドキュメントは、infra ディレクトリ配下で作業するときに最初に読む資料です。ここで宣言したルールは、
各 module / environment の実装が守るべき規約です。

---

## 1. ゴール

Phase 1 で達成するのは次の状態です。

- Cognito で認証されたユーザーが、ECS 上の Rust backend に到達できる。
- backend が Chime SDK Meetings を呼び出せる IAM 権限を持つ。
- backend が RDS PostgreSQL に接続できる。
- ML チームが GPU 搭載の EC2 上で推論コードを動かせる。
- ログが CloudWatch Logs に出ている。

Phase 1 では `CloudFront / Route53 / ACM / ElastiCache / MSK / EKS / SageMaker` は作りません。
必要になった時点で追加します。

---

## 2. ディレクトリ構成

```
infra/
├── CLAUDE.md                   # このファイル
├── README.md                   # 使い方 (apply 手順)
├── modules/                    # 再利用単位の AWS リソース定義
│   ├── network/                # VPC, subnets, routing, NAT, baseline SG
│   ├── cognito/                # User Pool + App Client
│   ├── rds/                    # RDS for PostgreSQL
│   ├── ecr/                    # backend 用 container registry
│   ├── ecs_backend/            # Fargate cluster + service + task def + ALB + IAM
│   └── ec2_ml/                 # GPU EC2 + IAM instance profile + SG
└── environment/
    └── dev/                    # 開発環境 (最初に構築する環境)
        ├── main.tf             # modules を呼び出す
        ├── variables.tf
        ├── outputs.tf
        ├── providers.tf
        ├── backend.tf          # tfstate の保存先
        └── terraform.tfvars.example
```

将来 `environment/stg` や `environment/prod` を追加しても、同じ module を呼び出すだけで済む構成にします。

---

## 3. module と environment の役割分担

### module (再利用部品)

- 1 つの関心事 (network だけ、rds だけ) を閉じ込める。
- 入力は `variables.tf` で受け取り、必要な AWS リソースを内部で組み立て、`outputs.tf` で ID/ARN/endpoint を返す。
- module の中で `provider` は宣言しない。`providers.tf` は environment 側が持つ。
- module 間で相互に `module.*` を参照させない。横結合は environment 側で行う。
- `data "aws_caller_identity" "current"` など環境依存の情報は原則 environment から受け取る。
- module 内部に `terraform.tfvars` は置かない。テスト値すら置かない。

### environment (具体の環境)

- 実在する AWS アカウント / リージョンに紐づく「具体の一式」。
- どの module を何個どう繋ぐかを決める唯一の場所。
- module 間の依存を `module.A.output` → `module.B.input` のように手で繋ぐ。
- ここだけが `provider "aws"` と `terraform { backend ... }` を宣言する。
- 秘匿値は `terraform.tfvars` (gitignore 済み) か環境変数 (`TF_VAR_*`) で渡す。
  コミットしていいのは `terraform.tfvars.example` だけ。

この分離により、「dev の挙動を変えたい」ときに `environment/dev/*.tf` だけを読めば済むようになります。

---

## 4. 命名 / タグ規約

### リソース名

`dolphin-{env}-{component}[-{suffix}]` を基本形にします。

例:

- `dolphin-dev-vpc`
- `dolphin-dev-backend-service`
- `dolphin-dev-rds-postgres`
- `dolphin-dev-ml-gpu`

module 内ではハードコードせず、`var.name_prefix` (例: `dolphin-dev`) と `var.component` を受け取り、
内部で組み立てます。

### タグ

以下を全リソースに付与します。environment 側で `default_tags` として宣言し、module はそれを継承します。

```hcl
default_tags {
  tags = {
    Project   = "dolphin"
    Env       = var.env            # dev / stg / prod
    ManagedBy = "terraform"
    Repo      = "progate_aws_hackathon_dolphin"
  }
}
```

module 固有の追加タグは `tags = merge(var.tags, { Component = "backend" })` のように上乗せします。

---

## 5. リージョン / ネットワーク

- リージョンは `ap-northeast-1` (東京) を既定にします。backend / ML の他チーム指定に合わせています。
- VPC は `/16`、public/private subnet を 2AZ ずつ切ります。
- 外向き通信 (ECS → Chime / Cognito / ECR / CloudWatch) は NAT Gateway 経由です。
  コスト最適化のため Phase 1 は NAT Gateway を 1 つだけに絞り、`single_nat_gateway = true` 相当で構築します。
- backend の ingress は ALB (public subnet) → ECS service (private subnet) の経路で固定します。
- ML の EC2 は初期は public subnet + EIP にして SSH/HTTPS でアクセスします。
  必要になったら private に移します。

---

## 6. tfstate 管理

- Phase 1 初期は **ローカル tfstate** で動かします (hackathon 速度優先)。
- ただし `environment/dev/backend.tf` には S3 + DynamoDB lock への切り替えをコメントで残します。
  最初の共同作業が発生するタイミングで必ず移行します。
- tfstate をコミットしない。`.gitignore` で `**/*.tfstate`, `**/*.tfstate.backup`, `.terraform/` を除外する。

---

## 7. シークレット取り扱い

- 平文のシークレットを tf ファイル / tfvars.example にコミットしない。
- 以下は `terraform.tfvars` (gitignore) または `TF_VAR_*` 環境変数で渡す:
  - RDS の master password
  - Cognito テストユーザーの初期パスワード (使う場合)
  - ML EC2 の `key_name` (先に AWS console で作って名前だけ渡す)
- 生成物 (Cognito User Pool ID, ECS task role ARN, RDS endpoint) は `outputs.tf` で露出してよい。
  これは backend チームに渡す値になる。
- 本番化する際は `aws_secretsmanager_secret` + `aws_secretsmanager_secret_version` でアプリに注入する。
  Phase 1 は ECS task definition の `environment` 直渡しで良い。

---

## 8. Phase 1 のリソース構成

| Module         | 主な作成物                                        | 利用側            |
|----------------|---------------------------------------------------|-------------------|
| `network`      | VPC / subnet / IGW / NAT / route table / base SG  | 全体              |
| `cognito`      | User Pool / App Client / (任意で) テストユーザー  | backend 認証      |
| `rds`          | Subnet group / SG / DB instance (PostgreSQL)      | backend の DB     |
| `ecr`          | backend 用 private repo                           | CI, ECS           |
| `ecs_backend`  | Fargate cluster / task def / service / ALB / IAM / CW Logs | backend 本体      |
| `ec2_ml`       | GPU EC2 / IAM / EIP / SG                          | ML チーム         |

### Chime 用 IAM

`ecs_backend` module の task role に以下を inline policy で付与します:

- `chime:CreateMeeting`
- `chime:CreateAttendee`
- `chime:DeleteMeeting`

Phase 1 は Resource を `*` で通し、疎通確認後に絞り込みます (運用コメント必須)。

### backend が受け取る環境変数

ECS task definition の `environment` に次を注入します:

- `APP_HOST=0.0.0.0`
- `APP_PORT=3000`
- `DATABASE_URL` — `rds` module の output から組み立てる
- `AWS_REGION` — environment の region 変数
- `CHIME_MEDIA_REGION` — 既定は `AWS_REGION` と同じ
- `COGNITO_USER_POOL_ID` — `cognito` module の output
- `COGNITO_CLIENT_ID` — `cognito` module の output

---

## 9. ML 用 EC2 の方針

- デフォルトインスタンスタイプは GPU 付きの `g5.2xlarge` にします。
  要件が固まったら `var.instance_type` を `g5.12xlarge` などに差し替えます。
  「一番ハイスペック」を初期から焼くとコストが急増するので、既定値は控えめにして environment 側で上書きする前提です。
- AMI は Ubuntu 22.04 + NVIDIA ドライバ済みの DLAMI (Deep Learning AMI) を使います。
- EBS は gp3 / 500GB を既定にします。モデル重みを載せることを想定。
- SSH 鍵はコンソールで作った既存の key pair を `var.key_name` で渡します。
  鍵本体は infra リポジトリに置きません。
- 22/tcp (SSH) と 8000/tcp (推論 API 想定) のみ開け、Source CIDR は `var.admin_cidr` で絞ります。
- IAM instance profile には S3 (モデル成果物の読み書き) と CloudWatch Logs を付けます。

---

## 10. apply ワークフロー

```bash
cd infra/environment/dev

# 初回のみ
terraform init

cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars            # 秘匿値を入れる

terraform plan -out tf.plan
terraform apply tf.plan
```

出力は `terraform output` で取得し、backend チームには以下を渡します。

- `aws_region`
- `chime_media_region`
- `cognito_user_pool_id`
- `cognito_client_id`
- `database_url_template` (password は別途共有)
- `backend_alb_dns_name` (疎通確認 URL)
- `backend_task_role_arn`

---

## 11. やらないこと (Phase 1 非対象)

- CloudFront / Route53 / ACM による HTTPS 公開
- ElastiCache / Redis / Valkey
- WebSocket 用 ALB ルール
- EKS / SageMaker / Step Functions
- 本番グレードの Multi-AZ DB / read replica
- WAF / GuardDuty / Security Hub のセットアップ

これらは次フェーズで別 module として追加します。現在の module 境界は、この追加がやりやすいように
責務を分けてあります (例: network を独立させているので ALB listener rule の拡張が楽)。

---

## 12. コードスタイル (Terraform)

- `terraform fmt` を必ず通す。CI に乗せる前でも手元で `fmt` する。
- `required_version = ">= 1.7.0"` を environment 側で宣言する。
- provider バージョンは `~> 5.0` 以上を目安に environment 側で pin する。module 側では宣言しない。
- 変数には必ず `description` と `type` を書く。`default` はコンポーネントの挙動を変えるようなものには付けない。
- `locals` は「複数リソースで共有する命名や tag の組み立て」にのみ使う。ロジックの隠蔽目的では使わない。
- 1 リソース 1 目的。大きくなったら module に切り出す。
- 削除された機能 / 未使用変数を残さない。`_` prefix で隠すよりも削除する。

---

## 13. 変更時のレビュー観点

PR 時に以下を self-check します。

- [ ] `terraform fmt -recursive` を通した
- [ ] `terraform validate` が environment/dev で通る
- [ ] 新規リソースに tag が乗っている
- [ ] module 間の直接参照を作っていない (environment 経由になっている)
- [ ] 秘匿値が tf / tfvars.example に入っていない
- [ ] 破壊的変更 (RDS の `force_destroy` / name 変更) がある場合は PR に明記
- [ ] backend チームに渡すべき output が増減したら README を更新
