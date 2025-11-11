output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

# 프론트 배포 편의용
output "s3_site_bucket_id" {
  value = module.s3_site.bucket_id
}
output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

# --- CloudFront (프론트엔드) ---
output "cloudfront_domain_name" {
  value       = module.cloudfront.domain_name
  description = "CloudFront distribution domain"
}

output "cloudfront_url" {
  value       = "https://${module.cloudfront.domain_name}"
  description = "Frontend URL (use this in browser)"
}

output "alb_http_url" {
  value       = "http://${module.alb.alb_dns_name}"
  description = "ALB HTTP URL (only if HTTP listener is enabled)"
}

output "alb_https_url" {
  value       = "https://${module.alb.alb_dns_name}"
  description = "ALB HTTPS URL (cert must match the hostname)"
}
