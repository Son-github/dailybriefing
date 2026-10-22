# Private PostgreSQL17/managed Secret/로그/알람입니다. 기본 protect이며 snapshot/데이터 삭제 정책을 먼저 확인하세요.
locals { name = "${var.project}-live" }
resource "aws_cloudwatch_log_group" "rds" {
  for_each          = toset(["postgresql", "upgrade"])
  name              = "/aws/rds/instance/${var.project}-live-postgres/${each.key}"
  retention_in_days = var.log_retention_days
}

resource "aws_db_subnet_group" "main" {

  name       = "${local.name}-db"
  subnet_ids = var.db_subnet_ids

}

resource "aws_db_instance" "main" {

  depends_on                      = [aws_cloudwatch_log_group.rds] # RDS의 암묵적 로그 그룹 생성과 충돌 방지
  identifier                      = "${local.name}-postgres"
  engine                          = "postgres"
  engine_version                  = "17"
  instance_class                  = var.db_instance_class
  allocated_storage               = var.db_storage_gb
  storage_type                    = "gp3"
  storage_encrypted               = true
  multi_az                        = false
  availability_zone               = var.availability_zone
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [var.db_security_group_id]
  publicly_accessible             = false
  db_name                         = var.restore_snapshot_identifier == null ? var.db_name : null
  username                        = var.restore_snapshot_identifier == null ? "briefingadmin" : null
  snapshot_identifier             = var.restore_snapshot_identifier
  manage_master_user_password     = true
  backup_retention_period         = 1
  backup_window                   = "18:00-19:00"
  maintenance_window              = "sun:19:30-sun:20:30"
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  auto_minor_version_upgrade      = true
  apply_immediately               = false
  deletion_protection             = var.database_disposal == "protect"
  skip_final_snapshot             = var.database_disposal == "discard"
  final_snapshot_identifier       = var.database_disposal == "snapshot" ? var.final_snapshot_identifier : null
  delete_automated_backups        = true
  copy_tags_to_snapshot           = true
  tags                            = { DataClass = "test-only" }
  lifecycle {

    precondition {

      condition     = var.database_disposal == "protect" || var.ephemeral_database_ack
      error_message = "삭제 가능한 테스트 DB임을 ephemeral_database_ack=true로 명시해야 합니다. 실제 개인 DB를 복사하지 마세요."

    }

    precondition {

      condition     = var.database_disposal != "snapshot" || length(var.final_snapshot_identifier) > 0
      error_message = "snapshot 모드는 매번 고유한 최종 스냅샷 이름이 필요합니다."

    }

  }

}

locals {
  alarms = {
    rds_cpu         = { namespace = "AWS/RDS", metric = "CPUUtilization", statistic = "Average", threshold = 80, comparison = "GreaterThanThreshold", dimensions = { DBInstanceIdentifier = aws_db_instance.main.identifier }, missing = "notBreaching" }
    rds_connections = { namespace = "AWS/RDS", metric = "DatabaseConnections", statistic = "Maximum", threshold = 80, comparison = "GreaterThanThreshold", dimensions = { DBInstanceIdentifier = aws_db_instance.main.identifier }, missing = "notBreaching" }
  }
}
resource "aws_cloudwatch_metric_alarm" "main" {

  for_each            = local.alarms
  alarm_name          = "${local.name}-${each.key}"
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  comparison_operator = each.value.comparison
  dimensions          = each.value.dimensions
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = each.value.missing
  alarm_actions       = var.alarm_sns_topic_arns

}
