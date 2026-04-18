output "security_group_id" {
  description = "Security group id attached to the DB instance."
  value       = aws_security_group.db.id
}

output "endpoint" {
  description = "DB endpoint (host:port)."
  value       = aws_db_instance.this.endpoint
}

output "address" {
  description = "DB hostname only."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "DB port."
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Logical database name."
  value       = aws_db_instance.this.db_name
}

output "username" {
  description = "Master username."
  value       = aws_db_instance.this.username
}

output "database_url" {
  description = "Fully-formed Postgres connection URL."
  value       = "postgres://${aws_db_instance.this.username}:${var.master_password}@${aws_db_instance.this.endpoint}/${aws_db_instance.this.db_name}"
  sensitive   = true
}
