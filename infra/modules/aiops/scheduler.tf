# 폭주가 발생할 때만 Lambda가 생성하는 일회성 예약의 경계입니다. 정기 스케줄은 없습니다.
# 개별 예약은 실행 완료 후 자동 삭제됩니다. 그룹 삭제 시 남은 예약도 함께 제거됩니다.
resource "aws_scheduler_schedule_group" "summary" {
  name = "${local.name}-summary"
}

resource "aws_iam_role" "summary_scheduler" {
  name = "${local.name}-summary-scheduler"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = var.aws_account_id }
        ArnEquals    = { "aws:SourceArn" = aws_scheduler_schedule_group.summary.arn }
      }
    }]
  })
}

resource "aws_iam_role_policy" "summary_scheduler" {
  role = aws_iam_role.summary_scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = local.analyzer_arn
    }]
  })
}
