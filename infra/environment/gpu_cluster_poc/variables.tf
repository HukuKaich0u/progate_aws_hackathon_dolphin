variable "env" {
  description = "Environment name, used in the name prefix and tags."
  type        = string
  default     = "poc"
}

variable "aws_region" {
  description = "AWS region. ap-northeast-1 matches the rest of the infra repo's dev environment."
  type        = string
  default     = "ap-northeast-1"
}

variable "fleet_size" {
  description = "How many worker instances to launch. t3.small × 127 + 1 parent × 2 vCPU = 256 vCPU (on-demand quota)."
  type        = number
  default     = 127
}

variable "instance_type" {
  description = "EC2 instance type for each worker."
  type        = string
  default     = "t3.small"
}

variable "parent_instance_type" {
  description = "EC2 instance type for the dispatcher (parent)."
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Existing EC2 key pair name. Empty means no SSH key attached."
  type        = string
  default     = ""
}

variable "admin_cidrs" {
  description = "CIDR blocks allowed to SSH into the parent. Workers never expose SSH."
  type        = list(string)
  default     = []
}
