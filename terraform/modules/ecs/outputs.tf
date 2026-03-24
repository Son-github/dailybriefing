output "cluster_id" {
  value = aws_ecs_cluster.this.id
}

output "service_names" {
  value = [for k, s in aws_ecs_service.svc : s.name]
}
