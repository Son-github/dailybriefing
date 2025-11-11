output "alb_arn" {
  value       = aws_lb.this.arn
  description = "ALB ARN"
}

output "alb_dns_name" {
  value       = aws_lb.this.dns_name
  description = "ALB DNS name"
}

output "alb_zone_id" {
  value       = aws_lb.this.zone_id
  description = "ALB Route53 zone ID"
}

output "http_listener_arn" {
  value       = aws_lb_listener.http.arn
  description = "HTTP listener ARN"
}

output "https_listener_arn" {
  value       = try(aws_lb_listener.https[0].arn, null)
  description = "HTTPS listener ARN (null if disabled)"
}

output "target_group_arns" {
  value       = { for k, tg in aws_lb_target_group.svc : k => tg.arn }
  description = "Map of service name to target group ARN"
}

