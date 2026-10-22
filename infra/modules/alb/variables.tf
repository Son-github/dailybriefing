# Root가 전달하는 입력입니다. ARN/식별자만 연결하며 비밀 원문은 받지 않습니다.
variable "alarm_sns_topic_arns" {
  type    = list(string)
  default = []

}

variable "alb_certificate_arn" {
  type    = string
  default = ""
}

variable "alb_security_group_id" { type = string }

variable "api_hosted_zone_id" {
  type    = string
  default = ""
}

variable "api_hostname" {
  type    = string
  default = ""

}

variable "aws_account_id" {

  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "실제 AWS 계정 ID 12자리가 필요합니다."
  }

}

variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}

variable "public_subnet_ids" { type = list(string) }

variable "region" {
  type    = string
  default = "ap-northeast-2"
}

variable "vpc_id" { type = string }
