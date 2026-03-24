variable "name"     { type = string }
variable "vpc_cidr" { type = string }

variable "az_a" { type = string }
variable "az_c" { type = string }

variable "public_a_cidr" { type = string }
variable "public_c_cidr" { type = string }
variable "ecs_a_cidr"    { type = string }
variable "ecs_c_cidr"    { type = string }
variable "db_a_cidr"     { type = string }
variable "db_c_cidr"     { type = string }

variable "enable_nat_gateway" {
  type = bool
  default = true
}

