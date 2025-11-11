resource "aws_ecs_cluster" "this" {
  name = var.cluster_name
}

# ---------- IAM (execution/task role) ----------
data "aws_iam_policy_document" "assume_task" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.name}-ecs-task-exec-role"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
  tags               = { Name = "${var.name}-ecs-task-exec-role" }
}

resource "aws_iam_role_policy_attachment" "exec_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task_role" {
  name               = "${var.name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
  tags               = { Name = "${var.name}-ecs-task-role" }
}

# ---------- CloudWatch Logs ----------
resource "aws_cloudwatch_log_group" "svc" {
  for_each = var.services
  name              = "/ecs/${each.key}"
  retention_in_days = var.cloudwatch_retention_days
}

data "aws_region" "current" {}

# ---------- Task Definitions ----------
resource "aws_ecs_task_definition" "svc" {
  for_each                 = var.services
  family                   = each.key
  cpu                      = tostring(each.value.cpu)
  memory                   = tostring(each.value.memory)
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode([{
    name      = each.key
    image     = each.value.image
    essential = true

    portMappings = [{
      containerPort = tonumber(each.value.container_port)
      hostPort      = tonumber(each.value.container_port)
      protocol      = "tcp"
    }]

    environment = [
      for k, v in each.value.env : { name = k, value = v }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.svc[each.key].name
        awslogs-region        = data.aws_region.current.name
        awslogs-stream-prefix = each.key
      }
    }
  }])

  lifecycle {
    create_before_destroy = true
  }
}

# ---------- Services ----------
resource "aws_ecs_service" "svc" {
  for_each             = var.services
  name                 = each.key
  cluster              = aws_ecs_cluster.this.id
  task_definition      = aws_ecs_task_definition.svc[each.key].arn
  desired_count        = tonumber(each.value.desired_count)
  launch_type          = "FARGATE"
  force_new_deployment = true

  # 초기 기동 시 ALB 헬스체크 여유
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = var.ecs_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  # ALB TargetGroup 연결(키가 있을 때만)
  dynamic "load_balancer" {
    for_each = contains(keys(var.target_group_arns), each.key) ? [each.key] : []
    content {
      target_group_arn = var.target_group_arns[each.key]
      container_name   = each.key
      container_port   = tonumber(each.value.container_port)
    }
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [
    aws_iam_role.task_execution,
    aws_iam_role.task_role
  ]
}

# ---------- (옵션) Application Auto Scaling ----------
resource "aws_appautoscaling_target" "svc" {
  for_each = var.enable_autoscaling ? var.services : {}

  max_capacity       = var.autoscaling.max_capacity
  min_capacity       = var.autoscaling.min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${each.key}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.svc]
}

resource "aws_appautoscaling_policy" "svc_cpu" {
  for_each = var.enable_autoscaling ? var.services : {}

  name               = "${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.svc[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.svc[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.svc[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = var.autoscaling.target_cpu

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
