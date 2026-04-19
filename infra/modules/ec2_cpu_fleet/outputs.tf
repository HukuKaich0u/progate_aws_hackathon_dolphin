output "asg_name" {
  description = "Auto Scaling Group name."
  value       = aws_autoscaling_group.this.name
}

output "asg_arn" {
  description = "Auto Scaling Group ARN."
  value       = aws_autoscaling_group.this.arn
}

output "launch_template_id" {
  description = "Launch Template id backing the ASG."
  value       = aws_launch_template.this.id
}

output "security_group_id" {
  description = "Security group id attached to every worker."
  value       = aws_security_group.this.id
}
