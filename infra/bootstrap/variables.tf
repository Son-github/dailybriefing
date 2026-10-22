# [사용자 설정 필요] AWS 콘솔 계정 ID(12자리). 다른 계정 배포를 provider에서도 차단합니다.
variable "aws_account_id" {

  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "실제 AWS 계정 ID 12자리가 필요합니다."
  }

}

variable "region" {
  type    = string
  default = "ap-northeast-2"
}

variable "project" {

  type    = string
  default = "dailybriefing"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "project는 소문자/숫자/하이픈 3~20자입니다."
  }

}

# [사용자 설정 필요] S3 전체에서 고유한 이름. 계정 ID 등을 조합하세요.
variable "state_bucket_name" {
  type = string
}
