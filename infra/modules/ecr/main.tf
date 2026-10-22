# Backend immutable image 저장소입니다. 저장 비용이 있으며 기본적으로 비어 있지 않으면 삭제를 막습니다.
resource "aws_ecr_repository" "backend" {

  name                 = "${var.project}-backend"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = var.allow_storage_cleanup
  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

}

resource "aws_ecr_lifecycle_policy" "backend" {

  repository = aws_ecr_repository.backend.name
  policy     = jsonencode({ rules = [{ rulePriority = 1, description = "최근 10개 이미지 보존; 운영 rollback digest 삭제 여부 확인", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 }, action = { type = "expire" } }] })

}
