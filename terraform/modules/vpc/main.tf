data "aws_region" "current" {}
data "aws_partition" "current" {}

# ---------------- VPC ----------------
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.name}-vpc"
  }
}

# ---------------- Subnets ----------------
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_a_cidr
  availability_zone       = var.az_a
  map_public_ip_on_launch = true
  tags = { Name = "${var.name}-public-a" }
}

resource "aws_subnet" "public_c" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_c_cidr
  availability_zone       = var.az_c
  map_public_ip_on_launch = true
  tags = { Name = "${var.name}-public-c" }
}

# ECS 전용 프라이빗 (2개 AZ 권장)
resource "aws_subnet" "ecs_a" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.ecs_a_cidr
  availability_zone = var.az_a
  tags = { Name = "${var.name}-ecs-a" }
}

resource "aws_subnet" "ecs_c" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.ecs_c_cidr
  availability_zone = var.az_c
  tags = { Name = "${var.name}-ecs-c" }
}

# DB 프라이빗(2개 AZ)
resource "aws_subnet" "db_a" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.db_a_cidr
  availability_zone = var.az_a
  tags = { Name = "${var.name}-db-a" }
}

resource "aws_subnet" "db_c" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.db_c_cidr
  availability_zone = var.az_c
  tags = { Name = "${var.name}-db-c" }
}

# ---------------- IGW & NAT ----------------
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-igw" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${var.name}-nat-eip" }
}

resource "aws_nat_gateway" "nat" {
  allocation_id     = aws_eip.nat.id
  subnet_id         = aws_subnet.public_a.id
  connectivity_type = "public"
  depends_on        = [aws_internet_gateway.igw]
  tags              = { Name = "${var.name}-nat" }
}

# ---------------- Route Tables ----------------
# Public
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "${var.name}-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_c" {
  subnet_id      = aws_subnet.public_c.id
  route_table_id = aws_route_table.public.id
}

# Private (ECS → NAT)
resource "aws_route_table" "private_ecs" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = { Name = "${var.name}-private-ecs-rt" }
}

resource "aws_route_table_association" "ecs_a" {
  subnet_id      = aws_subnet.ecs_a.id
  route_table_id = aws_route_table.private_ecs.id
}

resource "aws_route_table_association" "ecs_c" {
  subnet_id      = aws_subnet.ecs_c.id
  route_table_id = aws_route_table.private_ecs.id
}

# Private (DB — no internet)
resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-private-db-rt" }
}

resource "aws_route_table_association" "db_a" {
  subnet_id      = aws_subnet.db_a.id
  route_table_id = aws_route_table.private_db.id
}

resource "aws_route_table_association" "db_c" {
  subnet_id      = aws_subnet.db_c.id
  route_table_id = aws_route_table.private_db.id
}

# ---------------- Security Groups ----------------
# ALB
resource "aws_security_group" "alb" {
  count = var.create_sg_bundle ? 1 : 0

  name   = "${var.name}-alb-sg"
  vpc_id = aws_vpc.this.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.alb_ingress_cidrs
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.alb_ingress_cidrs
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-alb-sg" }
}

# ECS (인바운드 없음, ALB에서만 오픈)
resource "aws_security_group" "ecs" {
  count = var.create_sg_bundle ? 1 : 0

  name   = "${var.name}-ecs-sg"
  vpc_id = aws_vpc.this.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-ecs-sg" }
}

# ALB → ECS (지정 포트 허용)
resource "aws_security_group_rule" "ecs_from_alb" {
  for_each = var.create_sg_bundle ? {
    for p in var.ecs_ingress_from_alb_ports : tostring(p) => p
  } : {}

  type                     = "ingress"
  from_port                = each.value
  to_port                  = each.value
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs[0].id
  source_security_group_id = aws_security_group.alb[0].id
  description              = "ALB to ECS ${each.value}"
}

# DB
resource "aws_security_group" "db" {
  count = var.create_sg_bundle ? 1 : 0

  name   = "${var.name}-db-sg"
  vpc_id = aws_vpc.this.id

  # 인바운드: 아래 별도 rule에서 제한(ECS SG만 허용)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-db-sg" }
}

# ECS → DB (5432)
resource "aws_security_group_rule" "db_from_ecs" {
  count = var.create_sg_bundle ? 1 : 0

  type                     = "ingress"
  from_port                = var.db_port
  to_port                  = var.db_port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db[0].id
  source_security_group_id = aws_security_group.ecs[0].id
  description              = "ECS to DB"
}
