output "db_address" { value = aws_db_instance.postgres.address }
output "master_user_secret_arn" {
  value = aws_db_instance.postgres.master_user_secret[0].secret_arn
}
