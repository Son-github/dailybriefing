# Main의 실제 ECS 출력을 받습니다. Secret 원문과 이메일을 output에 노출하지 않습니다.
variable "project" { type = string }
variable "region" { type = string }
variable "aws_account_id" { type = string }
variable "backend_log_group_name" { type = string }
variable "backend_log_group_arn" { type = string }
variable "ecs_cluster_arn" { type = string }
variable "ecs_service_arn" { type = string }
variable "ecs_service_name" { type = string }
variable "package_path" { type = string }
variable "email" {
  type      = string
  sensitive = true
  validation {
    condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.email))
    error_message = "수신 이메일을 입력하세요. 생성 후 구독 확인이 필요합니다."
  }
}
# SSM SecureString/Secrets Manager의 ARN만 받습니다. 키 원문은 State에 넣지 않습니다.
variable "openai_key_arn" {
  type = string
  validation {
    condition     = var.openai_key_arn == "" || startswith(var.openai_key_arn, "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter/") || startswith(var.openai_key_arn, "arn:aws:secretsmanager:${var.region}:${var.aws_account_id}:secret:")
    error_message = "OpenAI 키 원문 대신 동일 계정/리전의 ARN만 입력하세요."
  }
}
variable "secret_kms_key_arn" { type = string }
variable "settings" {
  type = object({
    processing_enabled     = optional(bool, true)
    ai_enabled             = optional(bool, false)
    model                  = optional(string, "")
    daily_limit            = optional(number, 5)
    notification_limit     = optional(number, 20)
    max_log_chars          = optional(number, 3000)
    max_output_tokens      = optional(number, 700)
    api_timeout            = optional(number, 10)
    dedup_seconds          = optional(number, 1800)
    max_events             = optional(number, 20)
    ai_severities          = optional(list(string), ["HIGH", "CRITICAL"])
    log_retention_days     = optional(number, 7)
    input_usd_per_million  = optional(number, 0)
    output_usd_per_million = optional(number, 0)
  })
  validation {
    condition     = var.settings.daily_limit >= 0 && var.settings.daily_limit <= 100 && floor(var.settings.daily_limit) == var.settings.daily_limit && var.settings.notification_limit >= 0 && var.settings.notification_limit <= 100 && floor(var.settings.notification_limit) == var.settings.notification_limit && var.settings.api_timeout >= 1 && var.settings.api_timeout <= 15 && var.settings.max_log_chars >= 256 && var.settings.max_log_chars <= 8000 && var.settings.max_output_tokens >= 128 && var.settings.max_output_tokens <= 2000 && var.settings.dedup_seconds >= 60 && var.settings.dedup_seconds <= 86400 && var.settings.max_events >= 1 && var.settings.max_events <= 50 && alltrue([for s in var.settings.ai_severities : contains(["HIGH", "CRITICAL"], s)]) && var.settings.input_usd_per_million >= 0 && var.settings.output_usd_per_million >= 0 && alltrue([for n in [var.settings.api_timeout, var.settings.max_log_chars, var.settings.max_output_tokens, var.settings.dedup_seconds, var.settings.max_events] : floor(n) == n]) && contains([1, 3, 5, 7, 14, 30], var.settings.log_retention_days)
    error_message = "AIOps 호출/길이/timeout/중복/심각도/단가 설정 범위를 확인하세요. docs/AIOPS_COST_SECURITY.md 참고."
  }
}
