# Subnet Group: 이름을 고정(name)이 아니라 prefix로 생성 → 새 VPC로 바뀔 때 교체 생성
resource "aws_db_subnet_group" "rds_subnet_group" {
  # 예전: name = "${var.name}-db-subnet-group"
  # 변경: prefix 사용 → 랜덤 접미사로 새 리소스 생성 후 교체
  name_prefix = "${var.name}-dbsg-"
  subnet_ids  = var.db_subnet_ids

  tags = {
    Name = "${var.name}-db-subnet-group"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "rds" {
  identifier = "${var.name}-rds"
  engine     = "postgres"

  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_encrypted = var.storage_encrypted

  username = var.db_username
  password = var.db_password
  db_name  = var.db_name

  # 여기서 새로 만들어진 Subnet Group을 참조
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [var.rds_sg_id]

  publicly_accessible     = var.publicly_accessible
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  apply_immediately       = var.apply_immediately
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot

  tags = {
    Name = "${var.name}-rds"
  }
}
