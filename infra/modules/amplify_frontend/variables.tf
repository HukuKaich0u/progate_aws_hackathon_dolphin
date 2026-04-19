variable "name_prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "branch_name" {
  description = "Amplify branch name to create."
  type        = string
}

variable "app_root" {
  description = "Relative path to the frontend app in the repository."
  type        = string
  default     = "frontend"
}

variable "environment_variables" {
  description = "Environment variables injected into the Amplify build/runtime environment."
  type        = map(string)
  default     = {}
}

variable "enable_auto_build" {
  description = "Whether Amplify should auto-build on pushes to the connected branch."
  type        = bool
  default     = true
}

variable "stage" {
  description = "Amplify branch stage."
  type        = string
  default     = "DEVELOPMENT"
}

variable "tags" {
  description = "Extra tags."
  type        = map(string)
  default     = {}
}
