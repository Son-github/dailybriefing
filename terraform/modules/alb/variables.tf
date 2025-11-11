variable "name" {
  type        = string
  description = "Name prefix for ALB resources"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for ALB/TGs"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Public subnets for ALB"
}

variable "alb_sg_id" {
  type        = string
  description = "ALB security group ID"
}

variable "certificate_arn" {
  type        = string
  description = "ACM cert ARN for HTTPS listener (null to disable)"
  default     = null
}

variable "enable_access_logs" {
  type        = bool
  default     = false
}
variable "access_logs_bucket" {
  type    = string
  default = null
}
variable "access_logs_prefix" {
  type    = string
  default = null
}

# ✅ path(단일) 또는 paths(복수) 둘 중 하나만 있어도 되도록
variable "routes" {
  description = <<EOT
Map of service routes:
{
  svcA = { path  = "/api/a/*", port = 8081, health_check_path = "/actuator/health" }
  svcB = { paths = ["/api/b/*", "/api/c/*"], port = 8082 }
}
EOT
  type = map(object({
    port               = number
    path               = optional(string)
    paths              = optional(list(string))
    health_check_path  = optional(string)
  }))

  # 최소 하나의 패턴이 있어야 함
  validation {
    condition = alltrue([
      for r in values(var.routes) :
      (try(r.path != null && length(r.path) > 0, false) || try(length(r.paths) > 0, false))
    ])
    error_message = "Each route must define either 'path' or non-empty 'paths'."
  }
}

variable "health_check_path" {
  type        = string
  default     = "/"
  description = "Fallback health check path if per-service is not set"
}
