# Root가 다른 모듈과 연결할 식별자입니다. DB password/Secret 원문은 출력하지 않습니다.
output "db_host" { value = aws_db_instance.main.address }
output "db_secret_arn" { value = aws_db_instance.main.master_user_secret[0].secret_arn }
output "rds_identifier" { value = aws_db_instance.main.identifier }
