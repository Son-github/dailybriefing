variable "name" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "ecs_subnet_ids" {
  type = list(string)
}

variable "ecs_security_group_id" {
  type = string
}

# ALB 모듈 output: { "auth-service" = "tg-arn", ... }
variable "target_group_arns" {
  type = map(string)
}

# services = {
#   "auth-service" = {
#     cpu            = 256
#     memory         = 512
#     container_port = 8081
#     image          = "xxxxx.dkr.ecr.../auth-service:latest"
#     desired_count  = 1
#     env            = { ... } (optional)
#   }
# }
variable "services" {
  type = map(object({
    cpu            = number
    memory         = number
    container_port = number
    image          = string
    desired_count  = number
    env            = optional(map(string))
  }))
}

variable "common_env" {
  type    = map(string)
  default = {}
}

# common_secrets = { JWT_SECRET = "/dailybriefing/jwt/secret" }  # Secrets Manager "name"
variable "common_secrets" {
  type    = map(string)
  default = {}
}

# Fargate 기준
variable "assign_public_ip" {
  type    = bool
  default = false
}
