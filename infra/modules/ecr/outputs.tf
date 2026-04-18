output "repository_url" {
  description = "Repository URL used for docker push."
  value       = aws_ecr_repository.this.repository_url
}

output "repository_arn" {
  description = "Repository ARN for IAM policies."
  value       = aws_ecr_repository.this.arn
}

output "repository_name" {
  description = "Full repository name."
  value       = aws_ecr_repository.this.name
}
