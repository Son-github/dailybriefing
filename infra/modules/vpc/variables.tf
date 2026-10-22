# Main의 네트워크 설정을 전달받습니다. AZ 가용성은 실제 사용자 plan에서 확인합니다.
variable "project" {
  type = string
}

variable "region" {
  type = string
}

variable "availability_zones" {
  type = list(string)
}

variable "enable_backend" {
  type    = bool
  default = false
}
