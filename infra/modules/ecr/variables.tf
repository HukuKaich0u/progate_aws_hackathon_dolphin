variable "name_prefix" {
  description = "Prefix for the repository name (e.g. dolphin-dev)."
  type        = string
}

variable "repository_name" {
  description = "Short name of the repository. Final name is name_prefix/repository_name."
  type        = string
}

variable "image_tag_mutability" {
  description = "Whether image tags can be overwritten."
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Enable ECR image scanning on push."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags."
  type        = map(string)
  default     = {}
}
