variable "name_prefix" {
  description = "Prefix for resource names (e.g. dolphin-dev)."
  type        = string
}

variable "vpc_id" {
  description = "VPC id."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet id to launch the instance in."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type. Default is a single-GPU g5. Bump up as ML workload grows."
  type        = string
  default     = "g5.2xlarge"
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH. Create this in the AWS console, do not commit the key."
  type        = string
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 500
}

variable "root_volume_type" {
  description = "Root EBS volume type."
  type        = string
  default     = "gp3"
}

variable "admin_cidrs" {
  description = "CIDR blocks allowed to SSH into the ML host."
  type        = list(string)
}

variable "allow_inference_from_security_group_ids" {
  description = "Extra SGs allowed to hit the inference port (typically the backend ECS task SG)."
  type        = list(string)
  default     = []
}

variable "inference_port" {
  description = "HTTP port exposed by the ML inference server."
  type        = number
  default     = 8000
}

variable "ami_id" {
  description = "AMI id for the ML host. Leave empty to use the latest Ubuntu 22.04 Deep Learning AMI."
  type        = string
  default     = ""
}

variable "s3_bucket_arns" {
  description = "S3 bucket ARNs the instance can read/write. Use for model artifacts."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Extra tags."
  type        = map(string)
  default     = {}
}
