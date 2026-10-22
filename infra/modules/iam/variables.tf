# Root가 전달하는 입력입니다. ARN/식별자만 연결하며 비밀 원문은 받지 않습니다.
variable "application_secret_arns" { type = list(string) }

variable "aws_account_id" {

  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "실제 AWS 계정 ID 12자리가 필요합니다."
  }

}

variable "cloudfront_arn" { type = string }

variable "create_github_oidc_provider" {
  type    = bool
  default = true

}

variable "create_service_linked_roles" {
  type    = bool
  default = false

}

variable "ecr_arn" { type = string }

variable "existing_github_oidc_provider_arn" {
  type    = string
  default = ""

}

variable "frontend_bucket_arn" { type = string }

variable "github_repository_subject" {

  type = string
  validation {
    condition     = can(regex("^repo:[^:*]+/[^:*]+$", var.github_repository_subject))
    error_message = "와일드카드 없는 실제 저장소 OIDC subject prefix가 필요합니다."

  }

}

variable "log_group_arn" { type = string }

variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}

variable "region" {
  type    = string
  default = "ap-northeast-2"
}

variable "secret_kms_key_arns" {
  type    = list(string)
  default = []

}
