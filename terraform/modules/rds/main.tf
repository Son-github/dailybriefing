resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnet-group"
  subnet_ids = var.db_subnet_ids
  tags       = { Name = "${var.name}-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.name}-postgres"
  engine            = "postgres"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage

  db_name                     = var.db_name
  username                    = var.db_username
  manage_master_user_password = true
  port                        = var.db_port

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.db_sg_id]

  publicly_accessible     = false
  multi_az                = false
  storage_encrypted       = true
  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = true

  tags = { Name = "${var.name}-postgres" }
}
