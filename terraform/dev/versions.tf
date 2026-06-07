terraform {
  required_version = "~> 1.12.0"

  # 버킷 이름은 backend.hcl로 주입한다. 로컬 state 유실을 막기 위한 운영 필수 설정이다.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
}
