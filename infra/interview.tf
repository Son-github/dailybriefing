# 면접용 운영은 전체 destroy가 아니라 아래 모드를 바꾼 새 계획을 사용자 검토 후 적용합니다.
# 기본값은 기존과 같으므로 코드 추가만으로 현재 Backend를 내리지 않습니다.
variable "interview_mode" {
  type        = string
  default     = "running"
  description = "running → prepare-suspend(스냅샷 삭제 정책 저장) → suspended(실행 자원 제거). 재개는 스냅샷을 지정한 running입니다."
  validation {
    condition     = contains(["running", "prepare-suspend", "suspended"], var.interview_mode)
    error_message = "interview_mode는 running / prepare-suspend / suspended 중 하나입니다."
  }
  validation {
    condition     = var.interview_mode == "running" || (var.enable_backend && !var.allow_storage_cleanup && var.database_disposal != "discard")
    error_message = "면접 중단은 enable_backend=true, allow_storage_cleanup=false를 유지하고 discard 정책 없이 진행하세요."
  }
  validation {
    condition = var.interview_mode == "running" || (
      can(regex("^[a-z][a-z0-9-]{0,253}[a-z0-9]$", var.final_snapshot_identifier)) &&
      !strcontains(var.final_snapshot_identifier, "--") &&
      var.final_snapshot_identifier != var.restore_snapshot_identifier
    )
    error_message = "중단 전 새 final_snapshot_identifier가 필요합니다. 기존 복원 원본과 다른 소문자 시작 이름(문자/숫자/하이픈, 2~255자, 연속/끝 하이픈 금지)을 지정하세요."
  }
}

locals {
  backend_running             = var.enable_backend && var.interview_mode != "suspended"
  preparing_interview_suspend = var.interview_mode == "prepare-suspend"
  # 종료 중 ERROR/비정상 종료 이벤트가 AI 요청/알림으로 이어지지 않게 준비 단계부터 수집을 멈춥니다.
  # 재개 시에는 원래 processing_enabled/ai_enabled 설정을 사용합니다.
  aiops_processing_enabled    = var.enable_aiops && local.backend_running && var.interview_mode == "running" && var.aiops_settings.processing_enabled
  effective_database_disposal = local.preparing_interview_suspend ? "snapshot" : var.database_disposal
  effective_database_ack      = local.preparing_interview_suspend || var.ephemeral_database_ack
}

# 재개 계획 단계에서 지정 스냅샷의 존재/상태를 읽습니다. 스냅샷이 없거나 준비 중이면
# 실행 자원 생성 전에 계획을 중단합니다. 새 스냅샷을 생성하는 리소스는 아닙니다.
data "aws_db_snapshot" "interview_restore" {
  count                  = local.backend_running && var.restore_snapshot_identifier != null ? 1 : 0
  db_snapshot_identifier = var.restore_snapshot_identifier
  lifecycle {
    postcondition {
      condition     = self.status == "available" && self.engine == "postgres"
      error_message = "재개할 PostgreSQL 스냅샷이 available 상태여야 합니다. RDS Console에서 최종 스냅샷을 확인하세요."
    }
  }
}

output "interview" {
  description = "운영 모드 및 복구 안내. 스냅샷이 실제 생성/복원됐다는 확인을 대신하지 않습니다."
  value = {
    mode                     = var.interview_mode
    backend_running          = local.backend_running
    aiops_processing_enabled = local.aiops_processing_enabled
    final_snapshot           = var.final_snapshot_identifier
    restore_snapshot         = var.restore_snapshot_identifier
    api_dns_name             = var.api_hostname
    api_cname_target         = try(module.alb[0].alb_dns_name, null)
    frontend_url             = module.frontend.frontend_url
    runtime_change_required  = "중단 전 STATIC_DEMO, 재개 후 DNS/API 확인을 마친 뒤 LIVE를 Actions로 전환하세요."
  }
}
