# App/DB subnet과 route ID를 Root의 ALB/ECS/RDS/NAT 모듈에 전달합니다.
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = [for i in range(2) : aws_subnet.main["public-${i}"].id]
}

output "app_subnet_ids" {
  value = [for i in range(2) : aws_subnet.main["app-${i}"].id]
}

output "db_subnet_ids" {
  value = [for i in range(2) : aws_subnet.main["db-${i}"].id]
}

output "app_route_table_ids" {
  value = aws_route_table.app[*].id
}

output "availability_zones" {
  value = var.availability_zones
}

output "alb_security_group_id" { value = try(aws_security_group.alb[0].id, null) }
output "ecs_security_group_id" { value = try(aws_security_group.ecs[0].id, null) }
output "db_security_group_id" { value = try(aws_security_group.db[0].id, null) }
