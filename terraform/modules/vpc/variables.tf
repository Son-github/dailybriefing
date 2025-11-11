variable "name" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "az_a" {
  type = string
}

variable "az_c" {
  type = string
}

variable "public_a_cidr" {
  type = string
}

variable "public_c_cidr" {
  type = string
}

variable "ecs_a_cidr"    {
  type = string
}

# ← 새로 추가 (기존 ecs_cidr를 쓰고 있었다면 이름 맞춰 변경)
variable "ecs_c_cidr"    {
  type = string
} # ← 새로 추가

variable "db_a_cidr" {
  type = string
}

variable "db_c_cidr" {
  type = string
}

variable "enable_vpc_endpoints" {
  type    = bool
  default = false
}

variable "create_sg_bundle" {
  type    = bool
  default = true
}

variable "alb_ingress_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "ecs_ingress_from_alb_ports" {
  type        = list(number)
  default     = []
  description = "ALB → ECS 허용 포트"
}

variable "db_port" {
  type    = number
  default = 5432
}
