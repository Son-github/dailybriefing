locals {
  sorted          = sort(keys(var.routes))
  # ✅ 각 서비스의 매칭 패턴을 미리 계산 (타입 안전)
  route_patterns  = {
    for k, r in var.routes :
    k => coalescelist(
      try(r.paths, []),           # 우선 paths(list)
      try([r.path], [])           # 없으면 path(string)를 list로
    )
  }
}

# ---------------- ALB ----------------
resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.subnet_ids
  idle_timeout       = 60

  tags = { Name = "${var.name}-alb" }

  dynamic "access_logs" {
    for_each = var.enable_access_logs && var.access_logs_bucket != null ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = var.access_logs_prefix
      enabled = true
    }
  }
}

# ---------------- Target Groups ----------------
resource "aws_lb_target_group" "svc" {
  for_each    = var.routes
  name        = substr("${var.name}-${each.key}", 0, 32)
  port        = each.value.port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = var.health_check_path
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
  }

  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name}-${each.key}-tg" }
}

# ---------------- Listeners ----------------
# HTTP: ✅ 리다이렉트 제거 (CF가 http-only로 붙을 때 바로 포워딩)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

# HTTPS: 인증서 있을 때만 (있으면 동일 규칙도 붙여줌)
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn == null ? 0 : 1
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

# ---------------- Listener Rules ----------------
# ✅ HTTP 리스너 규칙
resource "aws_lb_listener_rule" "paths_http" {
  for_each     = var.routes
  listener_arn = aws_lb_listener.http.arn
  priority     = 100 + index(local.sorted, each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.svc[each.key].arn
  }

  condition {
    path_pattern {
      values = local.route_patterns[each.key]
    }
  }
}

# ✅ HTTPS 리스너 규칙 (있을 때만)
resource "aws_lb_listener_rule" "paths_https" {
  for_each     = var.certificate_arn == null ? {} : var.routes
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200 + index(local.sorted, each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.svc[each.key].arn
  }

  condition {
    path_pattern {
      values = local.route_patterns[each.key]
    }
  }
}
