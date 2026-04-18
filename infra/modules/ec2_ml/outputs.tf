output "instance_id" {
  description = "EC2 instance id."
  value       = aws_instance.this.id
}

output "public_ip" {
  description = "Elastic IP attached to the instance."
  value       = aws_eip.this.public_ip
}

output "public_dns" {
  description = "Public DNS name of the instance."
  value       = aws_instance.this.public_dns
}

output "security_group_id" {
  description = "Security group id attached to the instance."
  value       = aws_security_group.this.id
}

output "iam_role_arn" {
  description = "IAM role ARN attached to the instance profile."
  value       = aws_iam_role.this.arn
}

output "ssh_hint" {
  description = "Example SSH command."
  value       = "ssh -i <your-key.pem> ubuntu@${aws_eip.this.public_ip}"
}
