output "aws_region" {
  description = "AWS region."
  value       = var.aws_region
}

output "chime_media_region" {
  description = "Chime media region."
  value       = var.chime_media_region
}

output "cognito_user_pool_id" {
  description = "Cognito user pool id."
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito app client id."
  value       = module.cognito.client_id
}

output "backend_ecr_repository_url" {
  description = "Push backend images here."
  value       = module.ecr_backend.repository_url
}

output "backend_alb_dns_name" {
  description = "Public DNS for the backend ALB. Use as BACKEND_URL in live_smoke."
  value       = module.ecs_backend.alb_dns_name
}

output "backend_task_role_arn" {
  description = "ECS task role with Chime permissions."
  value       = module.ecs_backend.task_role_arn
}

output "backend_log_group_name" {
  description = "CloudWatch log group for the backend container."
  value       = module.ecs_backend.log_group_name
}

output "rds_endpoint" {
  description = "RDS endpoint (host:port)."
  value       = module.rds.endpoint
}

output "database_url" {
  description = "Full DATABASE_URL (password embedded). Share carefully."
  value       = module.rds.database_url
  sensitive   = true
}

output "ml_instance_public_ip" {
  description = "Public IP of the ML GPU EC2."
  value       = module.ml.public_ip
}

output "ml_ssh_hint" {
  description = "Example SSH command for the ML host."
  value       = module.ml.ssh_hint
}
