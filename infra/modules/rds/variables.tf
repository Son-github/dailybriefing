# Root가 전달하는 입력입니다. ARN/식별자만 연결하며 비밀 원문은 받지 않습니다.
variable "alarm_sns_topic_arns" {
  type    = list(string)
  default = []

}

variable "availability_zone" { type = string }

variable "database_disposal" {

  type    = string
  default = "protect"
  validation {
    condition     = contains(["protect", "snapshot", "discard"], var.database_disposal)
    error_message = "protect / snapshot / discard 중 선택하세요."

  }

}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"

}

variable "db_name" {
  type    = string
  default = "dailybriefing"

}

variable "db_security_group_id" { type = string }

variable "db_storage_gb" {
  type    = number
  default = 20

}

variable "db_subnet_ids" { type = list(string) }

variable "ephemeral_database_ack" {
  type    = bool
  default = false

}

variable "final_snapshot_identifier" {
  type    = string
  default = ""

}

variable "log_retention_days" {
  type    = number
  default = 14

}

variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}

variable "restore_snapshot_identifier" {
  type    = string
  default = null

}
