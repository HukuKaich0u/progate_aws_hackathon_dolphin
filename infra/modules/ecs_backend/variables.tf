variable "name_prefix" {
  description = "Prefix for resource names (e.g. dolphin-dev)."
  type        = string
}

variable "aws_region" {
  description = "AWS region the cluster runs in."
  type        = string
}

variable "vpc_id" {
  description = "VPC id."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet ids for the ALB."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet ids for the Fargate tasks."
  type        = list(string)
}

variable "container_image" {
  description = "Fully qualified container image (e.g. 123.dkr.ecr.ap-northeast-1.amazonaws.com/dolphin-dev/backend:latest)."
  type        = string
}

variable "container_port" {
  description = "Port the backend listens on inside the container."
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Number of Fargate tasks to run."
  type        = number
  default     = 1
}

variable "cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 512
}

variable "memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 1024
}

variable "log_retention_in_days" {
  description = "CloudWatch Logs retention."
  type        = number
  default     = 14
}

variable "environment" {
  description = "Plain environment variables to inject into the container."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets to inject via SSM Parameter Store or Secrets Manager. Map of env var name to ARN."
  type        = map(string)
  default     = {}
}

variable "chime_resource_arns" {
  description = "Resource ARNs allowed for Chime actions. Default is all."
  type        = list(string)
  default     = ["*"]
}

variable "health_check_path" {
  description = "HTTP path the ALB target group uses for health checks."
  type        = string
  default     = "/health"
}

variable "tags" {
  description = "Extra tags."
  type        = map(string)
  default     = {}
}
