resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${var.name}-vpc" }
}

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

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-igw" }
}

# -----------------------
# NAT Gateway (single)
# -----------------------
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

# -----------------------
# Route Tables
# -----------------------

# Public RT: 0.0.0.0/0 -> IGW
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

# ECS Private RT: 0.0.0.0/0 -> NAT (✅ 핵심 수정)
resource "aws_route_table" "private_ecs" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = { Name = "${var.name}-ecs-private-rt" }
}

resource "aws_route_table_association" "ecs_a" {
  subnet_id      = aws_subnet.ecs_a.id
  route_table_id = aws_route_table.private_ecs.id
}

resource "aws_route_table_association" "ecs_c" {
  subnet_id      = aws_subnet.ecs_c.id
  route_table_id = aws_route_table.private_ecs.id
}

# DB Private RT: 인터넷 라우트 없음(완전 프라이빗)
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
