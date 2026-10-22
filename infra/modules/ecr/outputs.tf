# Root가 다른 모듈과 연결할 식별자입니다. DB password/Secret 원문은 출력하지 않습니다.
output "repository_url" { value = aws_ecr_repository.backend.repository_url }
output "repository_arn" { value = aws_ecr_repository.backend.arn }
