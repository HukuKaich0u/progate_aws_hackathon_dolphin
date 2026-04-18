output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.this.name
}

output "task_role_arn" {
  description = "ARN of the task role (Chime permissions live here)."
  value       = aws_iam_role.task.arn
}

output "execution_role_arn" {
  description = "ARN of the ECS execution role."
  value       = aws_iam_role.execution.arn
}

output "service_security_group_id" {
  description = "SG attached to Fargate tasks. Allow this in RDS SG."
  value       = aws_security_group.service.id
}

output "alb_dns_name" {
  description = "Public DNS name of the ALB. Use this for smoke tests."
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone id (useful later for Route53 alias)."
  value       = aws_lb.this.zone_id
}

output "log_group_name" {
  description = "CloudWatch log group name for the backend container."
  value       = aws_cloudwatch_log_group.this.name
}
