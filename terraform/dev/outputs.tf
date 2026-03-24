output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "target_group_arns" {
  value = module.alb.target_group_arns
}

output "db_endpoint" {
  value = module.rds.db_address
}

output "frontend_bucket" {
  value = module.frontend.bucket_name
}

output "frontend_url" {
  value = "https://${module.frontend.cloudfront_domain_name}"
}

output "cloudfront_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}

output "ecs_cluster_id" {
  value = module.ecs.cluster_id
}
