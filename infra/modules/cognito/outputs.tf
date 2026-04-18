output "user_pool_id" {
  description = "Cognito user pool id."
  value       = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  description = "Cognito user pool ARN."
  value       = aws_cognito_user_pool.this.arn
}

output "client_id" {
  description = "App client id used by the backend to validate tokens."
  value       = aws_cognito_user_pool_client.backend.id
}

output "test_user_email" {
  description = "Email of the optional test user (empty when not created)."
  value       = var.create_test_user ? var.test_user_email : ""
}
