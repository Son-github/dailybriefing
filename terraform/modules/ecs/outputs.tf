# modules/ecs/outputs.tf

output "cluster_name" {
  value       = aws_ecs_cluster.this.name
  description = "ECS cluster name"
}

output "service_names" {
  value       = { for k, s in aws_ecs_service.svc : k => s.name }
  description = "Map of service name key -> ECS service name"
}

output "service_ids" {
  value       = { for k, s in aws_ecs_service.svc : k => s.id }
  description = "Map of service name key -> ECS service id"
}

