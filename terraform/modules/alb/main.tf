resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids
  tags               = { Name = "${var.name}-alb" }
}

resource "aws_lb_target_group" "tg" {
  for_each = var.services

  name = substr(
    replace("${var.name}-${each.key}", "_", "-"),
    0,
    32
  )

  vpc_id      = var.vpc_id
  protocol    = "HTTP"
  port        = each.value.container_port
  target_type = "ip"

  health_check {
    path                = each.value.health_check_path
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200-399"
  }
}

# ✅ HTTP(80) 리스너: 기본은 첫 번째 서비스로 forward
# (실전에서는 보통 80→443 리다이렉트지만, 1차 성공 목적으론 HTTP가 디버깅이 빠름)
locals {
  service_keys  = keys(var.services)
  default_svc   = length(local.service_keys) > 0 ? local.service_keys[0] : null
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg[local.default_svc].arn
  }
}

# ✅ Path 기반 라우팅 룰: /auth/* → auth-service TG 같은 형태
resource "aws_lb_listener_rule" "path_rule" {
  for_each = var.services

  listener_arn = aws_lb_listener.http.arn
  priority     = 100 + index(local.service_keys, each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg[each.key].arn
  }

  condition {
    path_pattern {
      values = ["${each.value.path_prefix}/*", each.value.path_prefix]
    }
  }
}

# (옵션) HTTPS 리스너 - 나중에 enable_https=true로 붙이기
resource "aws_lb_listener" "https" {
  count             = var.enable_https ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg[local.default_svc].arn
  }
}
