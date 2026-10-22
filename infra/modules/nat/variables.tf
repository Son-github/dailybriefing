# Root가 전달하는 입력입니다. ARN/식별자만 연결하며 비밀 원문은 받지 않습니다.
variable "app_route_table_ids" { type = list(string) }

variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}

variable "public_subnet_ids" { type = list(string) }
