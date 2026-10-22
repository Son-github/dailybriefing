# Provider 버전만 선언합니다. 계정 인증/provider/backend는 Main Root가 관리합니다.
terraform {

  required_version = ">= 1.11, < 2.0"
  required_providers {

    aws = { source = "hashicorp/aws", version = "~> 6.0" }

  }

}
