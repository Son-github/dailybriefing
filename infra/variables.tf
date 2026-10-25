# 사용자 입력값은 terraform.tfvars.example과 ENVIRONMENT_VARIABLES 문서를 확인하세요. 비밀 원문은 금지합니다.
variable "aws_account_id" {

  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "실제 AWS 계정 ID 12자리가 필요합니다."
  }

}

variable "region" {
  type    = string
  default = "ap-northeast-2"
}

variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}

variable "availability_zones" {

  type    = list(string)
  default = ["ap-northeast-2a", "ap-northeast-2c"]
  validation {
    condition     = length(var.availability_zones) == 2 && length(distinct(var.availability_zones)) == 2
    error_message = "서로 다른 AZ 2개를 지정하세요."

  }

}

variable "frontend_bucket_name" {
  type = string
}

variable "frontend_hostname" {
  type    = string
  default = ""

}

variable "frontend_certificate_arn" {
  description = "수동 발급 인증서 사용 시만 입력. manage_frontend_certificate=true이면 빈 값으로 둡니다."
  type        = string
  default     = ""

}

variable "manage_frontend_certificate" {
  description = "true이면 frontend_hostname의 ACM 인증서를 Terraform이 요청하고 관리합니다."
  type        = bool
  default     = false
}

variable "frontend_domain_enabled" {
  description = "가비아 검증 CNAME 등록 전 false, 등록 후 true. false이면 기존 CloudFront 기본 주소를 유지합니다."
  type        = bool
  default     = true
}


variable "api_hostname" {
  type    = string
  default = ""

}

variable "log_retention_days" {
  type    = number
  default = 14

}

variable "github_repository_subject" {

  type = string
  validation {
    condition     = can(regex("^repo:[^:*]+/[^:*]+$", var.github_repository_subject))
    error_message = "와일드카드 없는 실제 저장소 OIDC subject prefix가 필요합니다."

  }

}

variable "create_github_oidc_provider" {
  type    = bool
  default = true

}

variable "existing_github_oidc_provider_arn" {
  type    = string
  default = ""

}

variable "create_service_linked_roles" {
  type    = bool
  default = false

}

variable "secret_kms_key_arns" {
  type    = list(string)
  default = []

}


variable "allow_storage_cleanup" {
  type    = bool
  default = false
}

variable "alb_certificate_arn" {
  type    = string
  default = ""
}

variable "image_digest" {

  type    = string
  default = ""
  validation {
    condition     = var.image_digest == "" || can(regex("^sha256:[a-f0-9]{64}$", var.image_digest))
    error_message = "ECR sha256 digest가 필요합니다."

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

variable "task_count" {
  type    = number
  default = 1
  validation {
    condition     = var.task_count >= 1 && var.task_count <= 2
    error_message = "초기 구성은 1~2 태스크를 지원합니다."

  }

}

variable "use_both_app_azs" {
  type    = bool
  default = false

}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"

}

variable "db_storage_gb" {
  type    = number
  default = 20

}

variable "db_name" {
  type    = string
  default = "dailybriefing"

}

variable "database_disposal" {

  type    = string
  default = "protect"
  validation {
    condition     = contains(["protect", "snapshot", "discard"], var.database_disposal)
    error_message = "protect / snapshot / discard 중 선택하세요."

  }

}

variable "ephemeral_database_ack" {
  type    = bool
  default = false

}

variable "final_snapshot_identifier" {
  type    = string
  default = ""

}

variable "restore_snapshot_identifier" {
  type    = string
  default = null

}

variable "application_secrets" {
  type    = map(string)
  default = {}

  validation {
    condition     = alltrue([for name, arn in var.application_secrets : contains(["JWT_SECRET", "KMA_API_KEY", "KASI_API_KEY", "KAKAO_REST_API_KEY", "KOREA_EXIM_API_KEY", "NAVER_API_CLIENT_ID", "NAVER_API_CLIENT_SECRET"], name) && (startswith(arn, "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter/") || startswith(arn, "arn:aws:secretsmanager:${var.region}:${var.aws_account_id}:secret:"))])
    error_message = "허용된 API/JWT 환경변수와 동일 계정/리전의 Secret ARN만 입력하세요. 실제 비밀값은 금지합니다."
  }

}

variable "alarm_sns_topic_arns" {
  type    = list(string)
  default = []

}

# 최초 ECR 없는 문제를 같은 Main State의 2단계로 해결합니다. false도 기반 리소스 비용은 발생합니다.
variable "enable_backend" {
  type    = bool
  default = false
}
variable "environment" {
  type    = string
  default = "demo"
}

# AIOps 자체도 기본 꺼짐입니다. enable_backend=true가 선행되어야 합니다.
variable "enable_aiops" {
  type    = bool
  default = false
  validation {
    condition     = !var.enable_aiops || var.enable_backend
    error_message = "AIOps에는 기존 ECS Backend가 필요합니다. enable_backend를 먼저 확인하세요."
  }
}
variable "aiops_email" {
  type      = string
  default   = ""
  sensitive = true
}
variable "aiops_openai_key_arn" {
  type    = string
  default = ""
  validation {
    condition     = var.aiops_openai_key_arn == "" || startswith(var.aiops_openai_key_arn, "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter/") || startswith(var.aiops_openai_key_arn, "arn:aws:secretsmanager:${var.region}:${var.aws_account_id}:secret:")
    error_message = "OpenAI 키 원문 대신 동일 계정/리전의 ARN만 입력하세요."
  }

}
variable "aiops_secret_kms_key_arn" {
  type    = string
  default = ""
}
variable "aiops_package_path" {
  type    = string
  default = "../lambda/aiops/build/aiops.zip"
}
variable "aiops_settings" {
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
  default = {}
  validation {
    condition     = var.aiops_settings.daily_limit >= 0 && var.aiops_settings.daily_limit <= 100 && floor(var.aiops_settings.daily_limit) == var.aiops_settings.daily_limit && var.aiops_settings.notification_limit >= 0 && var.aiops_settings.notification_limit <= 100 && floor(var.aiops_settings.notification_limit) == var.aiops_settings.notification_limit && var.aiops_settings.api_timeout >= 1 && var.aiops_settings.api_timeout <= 15 && var.aiops_settings.max_log_chars >= 256 && var.aiops_settings.max_log_chars <= 8000 && var.aiops_settings.max_output_tokens >= 128 && var.aiops_settings.max_output_tokens <= 2000 && var.aiops_settings.dedup_seconds >= 60 && var.aiops_settings.dedup_seconds <= 86400 && var.aiops_settings.max_events >= 1 && var.aiops_settings.max_events <= 50 && alltrue([for s in var.aiops_settings.ai_severities : contains(["HIGH", "CRITICAL"], s)]) && var.aiops_settings.input_usd_per_million >= 0 && var.aiops_settings.output_usd_per_million >= 0 && alltrue([for n in [var.aiops_settings.api_timeout, var.aiops_settings.max_log_chars, var.aiops_settings.max_output_tokens, var.aiops_settings.dedup_seconds, var.aiops_settings.max_events] : floor(n) == n]) && contains([1, 3, 5, 7, 14, 30], var.aiops_settings.log_retention_days)
    error_message = "AIOps 호출/길이/timeout/중복/심각도/단가 설정 범위를 확인하세요. docs/AIOPS_COST_SECURITY.md 참고."
  }
}
