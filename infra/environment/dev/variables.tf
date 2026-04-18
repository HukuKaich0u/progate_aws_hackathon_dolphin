variable "env" {
  description = "Environment name, used in the name prefix and tags."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "chime_media_region" {
  description = "Region used by Chime SDK Meetings. Defaults to aws_region."
  type        = string
  default     = "ap-northeast-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR."
  type        = string
  default     = "10.20.0.0/16"
}

variable "azs" {
  description = "AZs to spread subnets across."
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs (match length of azs)."
  type        = list(string)
  default     = ["10.20.0.0/20", "10.20.16.0/20"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs (match length of azs)."
  type        = list(string)
  default     = ["10.20.32.0/20", "10.20.48.0/20"]
}

variable "rds_master_password" {
  description = "Master password for RDS PostgreSQL. Supply via terraform.tfvars or TF_VAR_rds_master_password."
  type        = string
  sensitive   = true
}

variable "backend_container_image" {
  description = "Container image for the Rust backend. Before first apply, push an image to ECR and pass its tag here."
  type        = string
}

variable "backend_desired_count" {
  description = "How many backend tasks to run."
  type        = number
  default     = 1
}

variable "backend_cpu" {
  description = "Fargate CPU units for the backend task."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate memory in MiB for the backend task."
  type        = number
  default     = 1024
}

variable "create_cognito_test_user" {
  description = "Create a test user in the Cognito pool."
  type        = bool
  default     = false
}

variable "cognito_test_user_email" {
  description = "Email for the test user."
  type        = string
  default     = ""
}

variable "cognito_test_user_temporary_password" {
  description = "Initial password for the test user."
  type        = string
  default     = ""
  sensitive   = true
}

variable "ml_instance_type" {
  description = "EC2 instance type for the ML GPU host."
  type        = string
  default     = "g5.2xlarge"
}

variable "ml_key_name" {
  description = "Existing EC2 key pair name for SSH into the ML host."
  type        = string
}

variable "ml_admin_cidrs" {
  description = "CIDRs allowed to SSH into the ML host. Use /32 for each teammate's public IP."
  type        = list(string)
}

variable "ml_s3_bucket_arns" {
  description = "S3 bucket ARNs the ML host can read/write. Leave empty until buckets exist."
  type        = list(string)
  default     = []
}
