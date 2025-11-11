variable "name_prefix" {
  description = "리소스 접두사"
  type        = string
  default     = "dailybriefing-dev"
}

# 프런트(선택)
variable "frontend_domain" {
  type    = string
  default = null
}

variable "frontend_hosted_zone_id" {
  type    = string
  default = null
}

variable "frontend_certificate_arn" {
  type        = string
  description = "CloudFront(us-east-1) 인증서 ARN"
  default     = null
}

# ALB 인증서(선택; 없으면 80만 켜짐)
variable "alb_certificate_arn" {
  type    = string
  default = null
}
