variable "name_prefix" {
  description = "Prefix for all resource names (e.g. dolphin-dev)."
  type        = string
}

variable "password_minimum_length" {
  description = "Minimum password length for the user pool."
  type        = number
  default     = 8
}

variable "create_test_user" {
  description = "If true, create a test user for smoke testing."
  type        = bool
  default     = false
}

variable "test_user_email" {
  description = "Email for the test user. Required when create_test_user is true."
  type        = string
  default     = ""
}

variable "test_user_temporary_password" {
  description = "Initial password for the test user. Must satisfy password policy."
  type        = string
  default     = ""
  sensitive   = true
}

variable "frontend_callback_urls" {
  description = "Allowed callback URLs for the frontend Cognito app client."
  type        = list(string)
  default     = []
}

variable "frontend_logout_urls" {
  description = "Allowed logout URLs for the frontend Cognito app client."
  type        = list(string)
  default     = []
}

variable "frontend_domain_prefix" {
  description = "Hosted UI domain prefix for Cognito."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Extra tags."
  type        = map(string)
  default     = {}
}
