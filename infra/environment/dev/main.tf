locals {
  name_prefix = "dolphin-${var.env}"
}

module "network" {
  source = "../../modules/network"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  azs                  = var.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  single_nat_gateway   = true
}

module "cognito" {
  source = "../../modules/cognito"

  name_prefix                  = local.name_prefix
  create_test_user             = var.create_cognito_test_user
  test_user_email              = var.cognito_test_user_email
  test_user_temporary_password = var.cognito_test_user_temporary_password
  frontend_callback_urls       = ["${trimsuffix(var.frontend_base_url, "/")}/auth/callback"]
  frontend_logout_urls         = [trimsuffix(var.frontend_base_url, "/")]
  frontend_domain_prefix       = var.frontend_cognito_domain_prefix
}

module "ecr_backend" {
  source = "../../modules/ecr"

  name_prefix     = local.name_prefix
  repository_name = "backend"
}

module "ecs_backend" {
  source = "../../modules/ecs_backend"

  name_prefix        = local.name_prefix
  aws_region         = var.aws_region
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids

  container_image = var.backend_container_image
  container_port  = 3000
  desired_count   = var.backend_desired_count
  cpu             = var.backend_cpu
  memory          = var.backend_memory

  environment = {
    APP_HOST             = "0.0.0.0"
    APP_PORT             = "3000"
    AWS_REGION           = var.aws_region
    CHIME_MEDIA_REGION   = var.chime_media_region
    COGNITO_USER_POOL_ID = module.cognito.user_pool_id
    COGNITO_CLIENT_ID    = module.cognito.client_id
    DATABASE_URL         = module.rds.database_url
    RUST_LOG             = "info,backend=debug"
  }
}

module "rds" {
  source = "../../modules/rds"

  name_prefix = local.name_prefix
  vpc_id      = module.network.vpc_id
  subnet_ids  = module.network.private_subnet_ids

  master_password     = var.rds_master_password
  deletion_protection = false
  skip_final_snapshot = true
}

# Break the module cycle (ecs_backend needs DATABASE_URL from rds, rds needs the
# ECS service SG as ingress). Attach the rule at the environment level so neither
# module has to know about the other.
resource "aws_security_group_rule" "rds_from_backend" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.rds.security_group_id
  source_security_group_id = module.ecs_backend.service_security_group_id
  description              = "PostgreSQL from backend Fargate tasks"
}

module "ml" {
  source = "../../modules/ec2_ml"

  name_prefix = local.name_prefix
  vpc_id      = module.network.vpc_id
  subnet_id   = module.network.public_subnet_ids[0]

  instance_type                           = var.ml_instance_type
  key_name                                = var.ml_key_name
  admin_cidrs                             = var.ml_admin_cidrs
  allow_inference_from_security_group_ids = [module.ecs_backend.service_security_group_id]
  s3_bucket_arns                          = var.ml_s3_bucket_arns
}

module "amplify_frontend" {
  source = "../../modules/amplify_frontend"

  name_prefix = local.name_prefix
  branch_name = var.frontend_branch_name

  environment_variables = {
    VITE_API_BASE_URL                = trimsuffix(var.frontend_api_base_url, "/")
    VITE_AWS_REGION                  = var.aws_region
    VITE_COGNITO_CLIENT_ID           = module.cognito.frontend_client_id
    VITE_COGNITO_DOMAIN              = module.cognito.frontend_domain
    VITE_COGNITO_REDIRECT_URI        = "${trimsuffix(var.frontend_base_url, "/")}/auth/callback"
    VITE_COGNITO_LOGOUT_REDIRECT_URI = trimsuffix(var.frontend_base_url, "/")
  }
}
