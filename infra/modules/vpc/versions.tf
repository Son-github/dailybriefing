# Provider 설정은 Main Root에서 상속합니다. 이 Child Module에는 backend가 없습니다.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
