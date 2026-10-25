# Root가 전달하는 입력입니다. ARN/식별자만 연결하며 비밀 원문은 받지 않습니다.
variable "allow_storage_cleanup" {
  type    = bool
  default = false
}

variable "api_hostname" {
  type    = string
  default = ""

}

variable "frontend_bucket_name" {
  type = string
}

variable "frontend_certificate_arn" {
  type    = string
  default = ""

}

variable "frontend_hostname" {
  type    = string
  default = ""

}


variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}
