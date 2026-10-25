# 비밀 원문/DB password는 출력하지 않습니다. GitHub Variables에는 이 공개 식별자만 입력합니다.
output "frontend_url" { value = module.frontend.frontend_url }
output "frontend_bucket" { value = module.frontend.frontend_bucket }
output "cloudfront_id" { value = module.frontend.cloudfront_id }
output "cloudfront_domain_name" { value = module.frontend.cloudfront_domain_name }
output "frontend_certificate_dns_validation" {
  description = "가비아에 등록할 검증 CNAME. 인증서 자동 갱신을 위해 유지하세요. 값에는 https://를 붙이지 않습니다."
  value = var.manage_frontend_certificate ? [
    for option in aws_acm_certificate.frontend[0].domain_validation_options : {
      domain = option.domain_name
      type   = option.resource_record_type
      name   = option.resource_record_name
      value  = option.resource_record_value
    }
  ] : []
}
output "ecr_url" { value = module.ecr.repository_url }
output "api_certificate_dns_validation" {
  description = "가비아에 등록할 API 인증서 검증 CNAME. 실제 API → ALB 연결 CNAME과 별개입니다."
  value = var.manage_api_certificate ? [
    for option in aws_acm_certificate.api[0].domain_validation_options : {
      domain = option.domain_name
      type   = option.resource_record_type
      name   = option.resource_record_name
      value  = option.resource_record_value
    }
  ] : []
}
output "github_roles" { value = module.iam.github_roles }
output "backend_enabled" { value = var.enable_backend }
output "alb_dns_name" { value = try(module.alb[0].alb_dns_name, null) }
output "cluster_name" { value = try(module.ecs[0].cluster_name, null) }
output "service_name" { value = try(module.ecs[0].service_name, null) }
output "target_group_arn" { value = try(module.alb[0].target_group_arn, null) }
output "rds_identifier" { value = try(module.rds[0].rds_identifier, null) }
output "log_group_name" { value = "/${var.project}/backend" }

output "aiops" { value = try({ function_name = module.aiops[0].function_name, topic_arn = module.aiops[0].topic_arn, table_name = module.aiops[0].table_name }, null) }
