output "asg_name" {
  description = "ASG name backing the worker fleet."
  value       = module.cpu_fleet.asg_name
}

output "launch_template_id" {
  description = "Launch Template id."
  value       = module.cpu_fleet.launch_template_id
}

output "worker_security_group_id" {
  description = "Worker fleet security group id."
  value       = module.cpu_fleet.security_group_id
}

output "parent_instance_id" {
  description = "Parent (dispatcher) instance id."
  value       = aws_instance.parent.id
}

output "parent_public_ip" {
  description = "Parent public IPv4."
  value       = aws_instance.parent.public_ip
}

output "parent_security_group_id" {
  description = "Parent security group id."
  value       = aws_security_group.parent.id
}

output "ecr_repository_url" {
  description = "ECR repository URL for the hello image (push target)."
  value       = aws_ecr_repository.hello.repository_url
}

output "ecr_registry" {
  description = "ECR registry host (for docker login)."
  value       = local.ecr_registry
}
