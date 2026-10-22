# Root가 전달하는 입력입니다. ARN/식별자만 연결하며 비밀 원문은 받지 않습니다.
variable "alarm_sns_topic_arns" {
  type    = list(string)
  default = []

}

variable "app_subnet_ids" { type = list(string) }

variable "application_secrets" {
  type    = map(string)
  default = {}

  validation {
    condition     = alltrue([for name, arn in var.application_secrets : contains(["JWT_SECRET", "KMA_API_KEY", "KASI_API_KEY", "KAKAO_REST_API_KEY", "KOREA_EXIM_API_KEY", "NAVER_API_CLIENT_ID", "NAVER_API_CLIENT_SECRET"], name) && (startswith(arn, "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter/") || startswith(arn, "arn:aws:secretsmanager:${var.region}:${var.aws_account_id}:secret:"))])
    error_message = "허용된 API/JWT 환경변수와 동일 계정/리전의 Secret ARN만 입력하세요. 실제 비밀값은 금지합니다."
  }

}

variable "aws_account_id" {

  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "실제 AWS 계정 ID 12자리가 필요합니다."
  }

}

variable "db_host" { type = string }

variable "db_name" {
  type    = string
  default = "dailybriefing"

}

variable "db_secret_arn" { type = string }

variable "ecr_arn" { type = string }

variable "ecr_url" { type = string }

variable "ecs_security_group_id" { type = string }

variable "frontend_url" { type = string }

variable "frontend_urls" { type = list(string) }

variable "image_digest" {

  type = string
  validation {
    condition     = can(regex("^sha256:[a-f0-9]{64}$", var.image_digest))
    error_message = "ECR sha256 digest가 필요합니다."

  }

}

variable "log_retention_days" {
  type    = number
  default = 14

}

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

variable "target_group_arn" { type = string }

variable "task_boundary_arn" { type = string }

variable "task_count" {
  type    = number
  default = 1
  validation {
    condition     = var.task_count >= 1 && var.task_count <= 2
    error_message = "초기 구성은 1~2 태스크를 지원합니다."

  }

}

variable "task_cpu" {
  type    = number
  default = 512

}

variable "task_memory" {
  type    = number
  default = 2048

}

variable "use_both_app_azs" {
  type    = bool
  default = false

}
