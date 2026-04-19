output "app_id" {
  description = "Amplify app id."
  value       = aws_amplify_app.this.id
}

output "app_name" {
  description = "Amplify app name."
  value       = aws_amplify_app.this.name
}

output "default_domain" {
  description = "Amplify default domain."
  value       = aws_amplify_app.this.default_domain
}

output "branch_name" {
  description = "Amplify branch name."
  value       = aws_amplify_branch.this.branch_name
}

output "branch_url" {
  description = "Amplify branch URL."
  value       = "https://${aws_amplify_branch.this.branch_name}.${aws_amplify_app.this.default_domain}"
}
