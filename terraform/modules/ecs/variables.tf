variable "name" {
  type        = string
  description = "Name prefix (e.g., dailybriefing-dev)"
}

variable "cluster_name" {
  type        = string
  description = "ECS cluster name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID (reference only)"
}

variable "ecs_subnet_ids" {
  type        = list(string)
  description = "Private subnets for ECS tasks (2 AZ 권장)"
}

variable "ecs_security_group_id" {
  type        = string
  description = "ECS tasks' Security Group ID (created in VPC module)"
}

variable "db_sg_id" {
  type        = string
  description = "DB Security Group ID (for ECS->DB rule). Empty string to skip."
  default     = ""
}

variable "enable_db_ingress" {
  type        = bool
  description = "Create ECS->DB(5432) ingress rule on DB SG when true (db_sg_id must be non-empty)."
  default     = false
}

variable "cpu_architecture" {
  type        = string
  description = "X86_64 or ARM64"
  default     = "X86_64"
}

variable "cloudwatch_retention_days" {
  type        = number
  description = "CloudWatch Logs retention (days)"
  default     = 14
}

# services: 키 = 서비스명(컨테이너명과 동일; GitHub Actions가 이 이름으로 이미지 패치)
variable "services" {
  description = "ECS services map keyed by service name"
  type = map(object({
    image          = string
    container_port = number
    desired_count  = number
    cpu            = number
    memory         = number
    env            = map(string)
  }))
  default = {}
}

# ALB 타깃그룹 연결용 맵: { service_name = target_group_arn }
# 키가 services의 키와 일치하는 항목만 ECS 서비스에 load_balancer 블록이 붙음
variable "target_group_arns" {
  description = "서비스명 -> TG ARN (있으면 해당 서비스만 ALB에 연결)"
  type        = map(string)
  default     = {}
}

# (선택) 오토스케일 파라미터 — 모듈 내에서 사용할 때만 의미 있음
variable "enable_autoscaling" {
  type        = bool
  description = "Enable Application Auto Scaling for services (if implemented in module)"
  default     = false
}

variable "autoscaling" {
  type = object({
    min_capacity = number
    max_capacity = number
    target_cpu   = number
  })
  description = "Auto scaling parameters (used only if enable_autoscaling=true)"
  default = {
    min_capacity = 1
    max_capacity = 2
    target_cpu   = 60
  }
}

