# Root가 다른 모듈과 연결할 식별자입니다. DB password/Secret 원문은 출력하지 않습니다.
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "service_name" { value = aws_ecs_service.app.name }
output "log_group_name" { value = aws_cloudwatch_log_group.backend.name }

# AIOps가 실제 배포 대상 ECS/로그만 구독하도록 식별자를 전달합니다.
output "cluster_arn" { value = aws_ecs_cluster.main.arn }
output "service_arn" { value = aws_ecs_service.app.id }
output "log_group_arn" { value = aws_cloudwatch_log_group.backend.arn }
