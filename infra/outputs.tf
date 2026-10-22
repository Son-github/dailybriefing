# 비밀 원문/DB password는 출력하지 않습니다. GitHub Variables에는 이 공개 식별자만 입력합니다.
output "frontend_url" { value = module.frontend.frontend_url }
output "frontend_bucket" { value = module.frontend.frontend_bucket }
output "cloudfront_id" { value = module.frontend.cloudfront_id }
output "ecr_url" { value = module.ecr.repository_url }
output "github_roles" { value = module.iam.github_roles }
output "backend_enabled" { value = var.enable_backend }
output "cluster_name" { value = try(module.ecs[0].cluster_name, null) }
output "service_name" { value = try(module.ecs[0].service_name, null) }
output "target_group_arn" { value = try(module.alb[0].target_group_arn, null) }
output "rds_identifier" { value = try(module.rds[0].rds_identifier, null) }
output "log_group_name" { value = "/${var.project}/backend" }

output "aiops" { value = try({ function_name = module.aiops[0].function_name, topic_arn = module.aiops[0].topic_arn, table_name = module.aiops[0].table_name }, null) }
