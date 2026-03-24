variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "alb_sg_id" {
  type = string
}

# services = {
#   "auth-service" = {
#     container_port    = 8081
#     path_prefix       = "/auth"
#     health_check_path = "/actuator/health"
#   }
#   ...
# }

variable "services" {
  type = map(object({
    container_port    = number
    path_prefix       = string
    health_check_path = string
  }))
}

# 1차 배포는 HTTP(80)로 빠르게 성공시키고, 나중에 HTTPS 붙이는 걸 추천
variable "enable_https" {
  type    = bool
  default = false
}

# enable_https=true 일 때만 사용
variable "acm_certificate_arn" {
  type    = string
  default = ""
}

