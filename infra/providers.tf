# Main Root에서만 provider/계정/공통 비용 태그를 설정합니다. Child Module은 이를 상속합니다.
provider "aws" {

  region              = var.region
  allowed_account_ids = [var.aws_account_id]
  default_tags {
    tags = { Project = var.project, Environment = var.environment, ManagedBy = "Terraform" }
  }

}

# CloudFront용 ACM 인증서는 버지니아 북부에서 관리해야 합니다.
# 기본 서울 provider는 변경하지 않아 기존 리소스의 리전이 바뀌지 않습니다.
provider "aws" {
  alias               = "us_east_1"
  region              = "us-east-1"
  allowed_account_ids = [var.aws_account_id]
  default_tags {
    tags = { Project = var.project, Environment = var.environment, ManagedBy = "Terraform" }
  }
}
