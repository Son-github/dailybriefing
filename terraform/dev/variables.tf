variable "name" {
  type = string
}

variable "ecr_repo_prefix" {
  type        = string
  description = "ECR registry + namespace prefix (e.g. 123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/dailybriefing)"
}

variable "vpc_cidr" {
  type = string
}

variable "public_a_cidr" {
  type = string
}

variable "public_c_cidr" {
  type = string
}

variable "ecs_a_cidr" {
  type = string
}

variable "ecs_c_cidr" {
  type = string
}

variable "db_a_cidr" {
  type = string
}

variable "db_c_cidr" {
  type = string
}

variable "az_a" {
  type = string
}

variable "az_c" {
  type = string
}

variable "alb_ingress_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

# 서비스 맵 (네가 준 구조를 정식화)
variable "services" {
  type = map(object({
    container_port    = number
    desired_count     = number
    cpu               = number
    memory            = number
    path_prefix       = string
    health_check_path = optional(string, "/actuator/health")
    env               = optional(map(string), {})
  }))
}

# DB
variable "db_port" {
  type    = number
  default = 5432
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "appdb"
}

variable "db_username" {
  type    = string
  default = "appuser"
}

variable "db_password" {
  type      = string
  sensitive = true
}
