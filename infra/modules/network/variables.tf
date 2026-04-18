variable "name_prefix" {
  description = "Prefix for all resource names (e.g. dolphin-dev)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "azs" {
  description = "Availability Zones to spread subnets across."
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets. Must match length of azs."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets. Must match length of azs."
  type        = list(string)
}

variable "single_nat_gateway" {
  description = "If true, share a single NAT Gateway across all private subnets. Cheaper, not HA."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags to merge onto every resource in this module."
  type        = map(string)
  default     = {}
}
