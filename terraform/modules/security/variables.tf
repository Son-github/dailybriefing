variable "name" { type = string }
variable "vpc_id" { type = string }

variable "alb_ingress_cidrs" {
  type = list(string)
}

variable "ecs_from_alb_ports" {
  type = list(number)
}

variable "db_port" {
  type = number
}


