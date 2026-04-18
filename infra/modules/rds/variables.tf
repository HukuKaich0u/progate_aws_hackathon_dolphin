variable "name_prefix" {
  description = "Prefix for all resource names (e.g. dolphin-dev)."
  type        = string
}

variable "vpc_id" {
  description = "VPC id the DB lives in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet ids for the DB subnet group."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group ids allowed to connect to the DB on port 5432."
  type        = list(string)
  default     = []
}

variable "engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16.4"
}

variable "instance_class" {
  description = "DB instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial storage size in GB."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "app"
}

variable "master_username" {
  description = "Master username for the DB."
  type        = string
  default     = "postgres"
}

variable "master_password" {
  description = "Master password for the DB."
  type        = string
  sensitive   = true
}

variable "multi_az" {
  description = "Whether to enable Multi-AZ."
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Whether to block accidental deletion. Turn on for prod."
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy. Dev only."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags."
  type        = map(string)
  default     = {}
}
