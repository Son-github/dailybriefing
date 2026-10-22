# Private Fargate/Task·Execution Role/로그/알람입니다. 실행 비용이 발생하며 prod/Secret ARN/health 설정을 유지합니다.
locals { name = "${var.project}-live" }
resource "aws_cloudwatch_log_group" "backend" {

  name              = "/${var.project}/backend"
  retention_in_days = var.log_retention_days

}
resource "aws_ecs_cluster" "main" {
  name = local.name
}

resource "aws_iam_role" "execution" {

  name                 = "${local.name}-execution"
  permissions_boundary = var.task_boundary_arn
  assume_role_policy   = local.task_trust

}

resource "aws_iam_role" "task" {

  name                 = "${local.name}-task"
  permissions_boundary = var.task_boundary_arn
  assume_role_policy   = local.task_trust
  # 앱은 AWS API를 직접 호출하지 않습니다. Task Role에는 서비스 권한을 부여하지 않습니다.

}

locals {

  task_trust    = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }] })
  db_secret_arn = var.db_secret_arn

}

resource "aws_iam_role_policy" "execution" {

  role = aws_iam_role.execution.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"], Resource = var.ecr_arn },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.backend.arn}:*" },
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = concat([local.db_secret_arn], values(var.application_secrets)) }
    ], length(var.application_secrets) == 0 ? [] : [
    { Effect = "Allow", Action = ["ssm:GetParameters"], Resource = values(var.application_secrets) }
    ], length(var.secret_kms_key_arns) == 0 ? [] : [
    { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secret_kms_key_arns }
  ]) })

}

resource "aws_ecs_task_definition" "app" {

  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {

    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"

  }

  container_definitions = jsonencode([{
    name                   = "backend", image = "${var.ecr_url}@${var.image_digest}", essential = true,
    portMappings           = [{ containerPort = 8080, hostPort = 8080, protocol = "tcp" }],
    readonlyRootFilesystem = false,
    environment = [
      { name = "SPRING_PROFILES_ACTIVE", value = "prod" },
      { name = "DATA_MODE", value = "LIVE" },
      { name = "COOKIE_SECURE", value = "true" },
      { name = "DB_HOST", value = var.db_host },
      { name = "DB_PORT", value = "5432" },
      { name = "DB_NAME", value = var.db_name },
      { name = "DB_SSL_MODE", value = "verify-full" },
      { name = "DB_SSL_ROOT_CERT", value = "/app/certs/rds-global-bundle.pem" },
      { name = "FRONTEND_URL", value = var.frontend_url },
      { name = "FRONTEND_URLS", value = join(",", var.frontend_urls) },
      { name = "CALENDAR_CLEANUP_ENABLED", value = var.task_count == 1 ? "true" : "false" }
    ],
    secrets = concat([
      { name = "DB_USERNAME", valueFrom = "${local.db_secret_arn}:username::" },
      { name = "DB_PASSWORD", valueFrom = "${local.db_secret_arn}:password::" }
    ], [for name, arn in var.application_secrets : { name = name, valueFrom = arn }]),
    logConfiguration = { logDriver = "awslogs", options = { "awslogs-group" = aws_cloudwatch_log_group.backend.name, "awslogs-region" = var.region, "awslogs-stream-prefix" = "ecs" } },
    healthCheck      = { command = ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/actuator/health/liveness || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 60 },
    stopTimeout      = 60
  }])

  lifecycle {

    precondition {

      condition     = alltrue([for key in ["JWT_SECRET", "KMA_API_KEY", "KASI_API_KEY", "KAKAO_REST_API_KEY", "KOREA_EXIM_API_KEY", "NAVER_API_CLIENT_ID", "NAVER_API_CLIENT_SECRET"] : contains(keys(var.application_secrets), key)])
      error_message = "필수 JWT/API 설정 7개의 ARN을 모두 지정하세요. 실제 비밀값은 쓰지 마세요."

    }

  }

}

resource "aws_ecs_service" "app" {

  name                               = "backend"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.app.arn
  desired_count                      = var.task_count
  launch_type                        = "FARGATE"
  platform_version                   = "1.4.0"
  health_check_grace_period_seconds  = 120
  wait_for_steady_state              = true
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {

    enable   = true
    rollback = true

  }

  network_configuration {

    assign_public_ip = false
    subnets          = var.use_both_app_azs ? var.app_subnet_ids : [var.app_subnet_ids[0]]
    security_groups  = [var.ecs_security_group_id]

  }

  load_balancer {

    target_group_arn = var.target_group_arn
    container_name   = "backend"
    container_port   = 8080

  }

  # 앱 배포 Workflow가 task revision을 갱신합니다. 이후 인프라 apply가 구버전으로 되돌리지 않습니다.
  # CPU/환경변수/Secret 변경 후에는 backend-deploy를 실행해 최신 family revision을 서비스에 반영하세요.
  lifecycle { ignore_changes = [task_definition] }
  depends_on = [aws_iam_role_policy.execution] # ALB listener/NAT 준비는 Root 모듈에서 연결

}



locals {
  alarms = {
    ecs_cpu    = { namespace = "AWS/ECS", metric = "CPUUtilization", statistic = "Average", threshold = 80, comparison = "GreaterThanThreshold", dimensions = { ClusterName = aws_ecs_cluster.main.name, ServiceName = aws_ecs_service.app.name }, missing = "notBreaching" }
    ecs_memory = { namespace = "AWS/ECS", metric = "MemoryUtilization", statistic = "Average", threshold = 85, comparison = "GreaterThanThreshold", dimensions = { ClusterName = aws_ecs_cluster.main.name, ServiceName = aws_ecs_service.app.name }, missing = "notBreaching" }
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
