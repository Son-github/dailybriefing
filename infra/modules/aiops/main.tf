# [비용 주의] 이 코드는 생성 정의입니다. 이번 작업에서는 AWS 명령을 실행하지 않습니다.
# Lambda는 VPC에 넣지 않습니다. 기존 ECS NAT와 별개로 AWS 기본 네트워크에서 HTTPS API에 접근합니다.
locals {
  name = "${var.project}-aiops"
  rules = {
    task = {
      source        = ["aws.ecs"]
      "detail-type" = ["ECS Task State Change"]
      detail        = { clusterArn = [var.ecs_cluster_arn], group = ["service:${var.ecs_service_name}"], lastStatus = ["STOPPED"], stopCode = ["TaskFailedToStart", "EssentialContainerExited"] }
    }
    deployment = {
      source        = ["aws.ecs"]
      "detail-type" = ["ECS Deployment State Change"]
      resources     = [var.ecs_service_arn]
      # 배포 이벤트에는 clusterArn이 없으므로 실제 service ARN으로 범위를 제한합니다.
      detail = { eventName = ["SERVICE_DEPLOYMENT_FAILED"] }
    }
  }
}
resource "aws_sns_topic" "alerts" { name = "${local.name}-alerts" }
# 실제 생성 시 SNS가 확인 메일을 보냅니다. Confirm subscription은 사용자가 직접 해야 합니다.
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.email
}
resource "aws_dynamodb_table" "state" {
  name         = "${local.name}-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  attribute {
    name = "pk"
    type = "S"
  }
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
  server_side_encryption { enabled = true }
  # 테스트 상태만 저장합니다. Main 삭제 시 quota/중복 캐시도 삭제되며 일일 상한 이력이 초기화됩니다.
  deletion_protection_enabled = false
}
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = var.settings.log_retention_days
}
resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
# [최소 권한] 자기 로그, 자기 table의 Get/Update, 자기 SNS Publish, 지정한 키 읽기만 허용합니다.
# ECS/RDS/SG 변경권한 및 backend 로그 전체 조회 권한은 없습니다(구독 payload에서만 수집).
resource "aws_iam_role_policy" "execution" {
  role = aws_iam_role.execution.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.lambda.arn}:*" },
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:UpdateItem"], Resource = aws_dynamodb_table.state.arn },
    { Effect = "Allow", Action = ["sns:Publish"], Resource = aws_sns_topic.alerts.arn }
    ], !var.settings.ai_enabled ? [] : [
    { Effect = "Allow", Action = startswith(var.openai_key_arn, "arn:aws:ssm:") ? ["ssm:GetParameter"] : ["secretsmanager:GetSecretValue"], Resource = var.openai_key_arn }
    ], !var.settings.ai_enabled || var.secret_kms_key_arn == "" ? [] : [
    { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secret_kms_key_arn }
  ]) })
}
resource "aws_lambda_function" "analyzer" {
  function_name                  = local.name
  role                           = aws_iam_role.execution.arn
  runtime                        = "python3.13"
  architectures                  = ["x86_64"]
  handler                        = "handler.lambda_handler"
  filename                       = var.package_path
  source_code_hash               = fileexists(var.package_path) ? filebase64sha256(var.package_path) : null
  memory_size                    = 256
  timeout                        = 60
  reserved_concurrent_executions = 2
  environment {
    variables = {
      PROCESSING_ENABLED       = tostring(var.settings.processing_enabled)
      AI_ENABLED               = tostring(var.settings.ai_enabled)
      GPT_MODEL                = var.settings.model
      DAILY_GPT_LIMIT          = tostring(var.settings.daily_limit)
      DAILY_NOTIFICATION_LIMIT = tostring(var.settings.notification_limit)
      MAX_LOG_CHARS            = tostring(var.settings.max_log_chars)
      MAX_OUTPUT_TOKENS        = tostring(var.settings.max_output_tokens)
      GPT_TIMEOUT_SECONDS      = tostring(var.settings.api_timeout)
      DEDUP_SECONDS            = tostring(var.settings.dedup_seconds)
      MAX_EVENTS               = tostring(var.settings.max_events)
      AI_SEVERITIES            = join(",", var.settings.ai_severities)
      SERVICE_NAME             = "daily-briefing"
      ECS_CLUSTER_ARN          = var.ecs_cluster_arn
      ECS_SERVICE_ARN          = var.ecs_service_arn
      ECS_SERVICE_NAME         = var.ecs_service_name
      SNS_TOPIC_ARN            = aws_sns_topic.alerts.arn
      STATE_TABLE              = aws_dynamodb_table.state.name
      OPENAI_KEY_ARN           = var.settings.ai_enabled ? var.openai_key_arn : ""
      INPUT_USD_PER_MILLION    = tostring(var.settings.input_usd_per_million)
      OUTPUT_USD_PER_MILLION   = tostring(var.settings.output_usd_per_million)
    }
  }
  lifecycle {
    precondition {
      condition     = fileexists(var.package_path)
      error_message = "Lambda ZIP이 없습니다. 저장소 root에서 bash scripts/build_aiops.sh를 먼저 실행하세요."
    }
    precondition {
      condition     = !var.settings.ai_enabled || (var.settings.model != "" && (startswith(var.openai_key_arn, "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter/") || startswith(var.openai_key_arn, "arn:aws:secretsmanager:${var.region}:${var.aws_account_id}:secret:")))
      error_message = "AI 활성화에는 GPT model과 동일 계정/리전의 SSM/Secret ARN이 필요합니다. 키 원문은 금지합니다."
    }
    precondition {
      condition     = var.backend_log_group_name != aws_cloudwatch_log_group.lambda.name
      error_message = "Lambda 자신의 로그 그룹을 구독하면 재귀 호출됩니다. Backend 로그만 지정하세요."
    }
  }
  depends_on = [aws_iam_role_policy.execution, aws_cloudwatch_log_group.lambda]
}
# SNS 실패/lease 충돌 등은 비동기 재시도 2회. 이후 손실 가능성은 Lambda Errors에서 운영자가 점검합니다.
# 원본 payload/개인정보가 별도 DLQ에 복제되는 것을 피하려고 DLQ를 추가하지 않았습니다.
resource "aws_lambda_function_event_invoke_config" "retry" {
  function_name                = aws_lambda_function.analyzer.function_name
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600
}
resource "aws_lambda_permission" "logs" {
  statement_id   = "BackendLogsOnly"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.analyzer.function_name
  principal      = "logs.${var.region}.amazonaws.com"
  source_account = var.aws_account_id
  source_arn     = "${var.backend_log_group_arn}:*"
}
resource "aws_cloudwatch_log_subscription_filter" "backend" {
  count           = var.settings.processing_enabled ? 1 : 0
  name            = local.name
  log_group_name  = var.backend_log_group_name
  filter_pattern  = "\"ERROR\""
  destination_arn = aws_lambda_function.analyzer.arn
  depends_on      = [aws_lambda_permission.logs]
}
resource "aws_cloudwatch_event_rule" "ecs" {
  for_each      = { for key, pattern in local.rules : key => jsonencode(pattern) }
  name          = "${local.name}-${each.key}"
  event_pattern = each.value
  state         = var.settings.processing_enabled ? "ENABLED" : "DISABLED"
}
resource "aws_lambda_permission" "events" {
  for_each       = aws_cloudwatch_event_rule.ecs
  statement_id   = "Ecs-${each.key}"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.analyzer.function_name
  principal      = "events.amazonaws.com"
  source_account = var.aws_account_id
  source_arn     = each.value.arn
}
resource "aws_cloudwatch_event_target" "ecs" {
  for_each  = aws_cloudwatch_event_rule.ecs
  rule      = each.value.name
  target_id = "AiopsAnalyzer"
  arn       = aws_lambda_function.analyzer.arn
  retry_policy {
    maximum_retry_attempts       = 2
    maximum_event_age_in_seconds = 3600
  }
  depends_on = [aws_lambda_permission.events]
}
# AIOps 자체 처리 실패는 분석 Lambda를 거치지 않고 고정 CloudWatch 알람으로 알립니다.
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.name}-delivery-errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.analyzer.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
# CloudWatch 알람 발송은 이 topic에 한정하며 분석 Lambda를 재호출하지 않습니다.
resource "aws_sns_topic_policy" "alarms" {
  arn = aws_sns_topic.alerts.arn
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Sid = "LambdaPublisher", Effect = "Allow", Principal = { AWS = aws_iam_role.execution.arn }, Action = "sns:Publish", Resource = aws_sns_topic.alerts.arn },
    { Sid = "CloudWatchAlarm", Effect = "Allow", Principal = { Service = "cloudwatch.amazonaws.com" }, Action = "sns:Publish", Resource = aws_sns_topic.alerts.arn, Condition = { StringEquals = { "aws:SourceAccount" = var.aws_account_id }, ArnEquals = { "aws:SourceArn" = aws_cloudwatch_metric_alarm.lambda_errors.arn } } }
  ] })
}
