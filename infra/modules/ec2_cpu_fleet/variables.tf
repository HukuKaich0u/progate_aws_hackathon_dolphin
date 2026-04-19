variable "name_prefix" {
  description = "Prefix for resource names (e.g. dolphin-poc)."
  type        = string
}

variable "vpc_id" {
  description = "VPC id the fleet lives in."
  type        = string
}

variable "subnet_ids" {
  description = "Subnet ids the fleet can launch into. Instances are spread across these AZs."
  type        = list(string)
}

variable "fleet_size" {
  description = "Number of worker instances to launch."
  type        = number
}

variable "instance_type" {
  description = "EC2 instance type for each worker."
  type        = string
  default     = "t2.nano"
}

variable "ami_id" {
  description = "AMI id for each worker. Leave empty to use the latest Amazon Linux 2023 x86_64."
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Existing EC2 key pair name. Leave empty to launch without a key (no SSH)."
  type        = string
  default     = ""
}

variable "admin_cidrs" {
  description = "CIDR blocks allowed to SSH into workers. Empty disables SSH ingress entirely."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Extra tags merged into every fleet resource and propagated to launched instances."
  type        = map(string)
  default     = {}
}

variable "user_data" {
  description = "Raw (non base64) user_data script for each worker. Empty disables."
  type        = string
  default     = ""
}

variable "iam_instance_profile_name" {
  description = "Name of an existing IAM instance profile to attach to every worker."
  type        = string
  default     = ""
}
