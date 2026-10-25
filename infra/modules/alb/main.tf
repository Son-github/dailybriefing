# CloudFront HTTPS → ALB → ECS target group을 연결합니다. 실제 API DNS/서울 ACM이 필요합니다.
locals { name = "${var.project}-live" }
resource "aws_lb" "main" {

  name                       = local.name
  load_balancer_type         = "application"
  internal                   = false
  security_groups            = [var.alb_security_group_id]
  subnets                    = var.public_subnet_ids
  drop_invalid_header_fields = true
  idle_timeout               = 60

}

resource "aws_lb_target_group" "app" {

  name                 = "${local.name}-app"
  port                 = 8080
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30
  health_check {

    path                = "/actuator/health/readiness"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3

  }

}

resource "aws_lb_listener" "https" {

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.alb_certificate_arn
  default_action {

    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn

  }

  lifecycle {

    precondition {

      condition     = var.api_hostname != "" && startswith(var.alb_certificate_arn, "arn:aws:acm:${var.region}:${var.aws_account_id}:certificate/")
      error_message = "LIVE 공개에는 실제 API DNS와 동일 리전/계정의 ACM 인증서가 필요합니다."

    }

  }

}


locals {
  alarms = {
    alb_5xx       = { namespace = "AWS/ApplicationELB", metric = "HTTPCode_ELB_5XX_Count", statistic = "Sum", threshold = 5, comparison = "GreaterThanThreshold", dimensions = { LoadBalancer = aws_lb.main.arn_suffix }, missing = "notBreaching" }
    target_health = { namespace = "AWS/ApplicationELB", metric = "HealthyHostCount", statistic = "Minimum", threshold = 1, comparison = "LessThanThreshold", dimensions = { LoadBalancer = aws_lb.main.arn_suffix, TargetGroup = aws_lb_target_group.app.arn_suffix }, missing = "breaching" }
    response_time = { namespace = "AWS/ApplicationELB", metric = "TargetResponseTime", statistic = "Average", threshold = 3, comparison = "GreaterThanThreshold", dimensions = { LoadBalancer = aws_lb.main.arn_suffix }, missing = "notBreaching" }
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
