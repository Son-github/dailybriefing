output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "ALB용 퍼블릭 서브넷 두 개"
  value       = [aws_subnet.public_a.id, aws_subnet.public_c.id]
}

output "public_subnet_id" {
  description = "호환용 (public_a)"
  value       = aws_subnet.public_a.id
}

output "ecs_subnet_ids"   {
  value = [aws_subnet.ecs_a.id, aws_subnet.ecs_c.id]
}

output "db_subnet_ids" {
  description = "RDS용 DB 서브넷 두 개"
  value       = [aws_subnet.db_a.id, aws_subnet.db_c.id]
}

output "alb_sg_id" {
  value = aws_security_group.alb[0].id
}

output "ecs_sg_id" {
  value = aws_security_group.ecs[0].id
}

output "db_sg_id" {
  value = aws_security_group.db[0].id
}
