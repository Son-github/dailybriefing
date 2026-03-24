output "vpc_id" { value = aws_vpc.this.id }
output "public_subnet_ids" { value = [aws_subnet.public_a.id, aws_subnet.public_c.id] }
output "ecs_subnet_ids"    { value = [aws_subnet.ecs_a.id, aws_subnet.ecs_c.id] }
output "db_subnet_ids"     { value = [aws_subnet.db_a.id, aws_subnet.db_c.id] }

