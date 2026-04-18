# Phase 1 uses a local state file for speed.
# Switch to S3 + DynamoDB locking once more than one person is applying.
#
# terraform {
#   backend "s3" {
#     bucket         = "dolphin-tfstate"
#     key            = "environment/dev/terraform.tfstate"
#     region         = "ap-northeast-1"
#     dynamodb_table = "dolphin-tfstate-lock"
#     encrypt        = true
#   }
# }
