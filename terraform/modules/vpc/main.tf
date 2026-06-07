resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.name}-vpc" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_a_cidr
  availability_zone       = var.az_a
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name}-public-a" }
}

resource "aws_subnet" "public_c" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_c_cidr
  availability_zone       = var.az_c
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name}-public-c" }
}

resource "aws_subnet" "ecs_a" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.ecs_a_cidr
  availability_zone = var.az_a
  tags              = { Name = "${var.name}-ecs-a" }
}

resource "aws_subnet" "ecs_c" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.ecs_c_cidr
  availability_zone = var.az_c
  tags              = { Name = "${var.name}-ecs-c" }
}

resource "aws_subnet" "db_a" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.db_a_cidr
  availability_zone = var.az_a
  tags              = { Name = "${var.name}-db-a" }
}

resource "aws_subnet" "db_c" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.db_c_cidr
  availability_zone = var.az_c
  tags              = { Name = "${var.name}-db-c" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-igw" }
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

# 이전에는 ECS private subnet이 NAT Gateway를 통해 외부 API를 호출했다.
# 비용 절감을 위해 ECS task에 public IP를 부여하고 IGW로 직접 나가게 한다.
resource "aws_route_table" "private_ecs" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
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
