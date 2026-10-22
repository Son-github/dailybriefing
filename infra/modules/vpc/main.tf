# 6개 subnet과 기본 route를 관리합니다. DB subnet에는 인터넷 기본 경로가 없습니다.






data "aws_availability_zones" "available" {
  state = "available"
}

locals {

  cidrs   = { public = ["10.20.1.0/24", "10.20.2.0/24"], app = ["10.20.11.0/24", "10.20.12.0/24"], db = ["10.20.21.0/24", "10.20.22.0/24"] }
  subnets = merge([for kind, cidrs in local.cidrs : { for i, cidr in cidrs : "${kind}-${i}" => { kind = kind, index = i, cidr = cidr } }]...)

}

resource "aws_vpc" "main" {

  cidr_block           = "10.20.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "${var.project}-vpc" }
  lifecycle {
    precondition {

      condition     = length(var.availability_zones) == 2 && length(setsubtract(toset(var.availability_zones), toset(data.aws_availability_zones.available.names))) == 0
      error_message = "선택한 2개 AZ가 현재 계정/리전에서 사용 가능해야 합니다."

    }

  }

}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "main" {

  for_each                = local.subnets
  vpc_id                  = aws_vpc.main.id
  availability_zone       = var.availability_zones[each.value.index]
  cidr_block              = each.value.cidr
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.project}-${each.key}", Tier = each.value.kind }

}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "internet" {

  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id

}

resource "aws_route_table_association" "public" {

  count          = 2
  subnet_id      = aws_subnet.main["public-${count.index}"].id
  route_table_id = aws_route_table.public.id

}

resource "aws_route_table" "app" {

  count  = 2
  vpc_id = aws_vpc.main.id

}

resource "aws_route_table_association" "app" {

  count          = 2
  subnet_id      = aws_subnet.main["app-${count.index}"].id
  route_table_id = aws_route_table.app[count.index].id

}

resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table_association" "db" {

  count          = 2
  subnet_id      = aws_subnet.main["db-${count.index}"].id
  route_table_id = aws_route_table.db.id

}














locals { name = "${var.project}-live" }

resource "aws_security_group" "alb" {
  count = var.enable_backend ? 1 : 0

  name_prefix = "${local.name}-alb-"
  vpc_id      = aws_vpc.main.id
  description = "CloudFront HTTPS to public ALB"

}

resource "aws_security_group" "ecs" {
  count = var.enable_backend ? 1 : 0

  name_prefix = "${local.name}-ecs-"
  vpc_id      = aws_vpc.main.id
  description = "ALB to private Fargate"

}

resource "aws_security_group" "db" {
  count = var.enable_backend ? 1 : 0

  name_prefix = "${local.name}-db-"
  vpc_id      = aws_vpc.main.id
  description = "Fargate to private PostgreSQL"

}

resource "aws_vpc_security_group_ingress_rule" "alb" {
  count = var.enable_backend ? 1 : 0

  security_group_id = aws_security_group.alb[0].id
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront[0].id
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443

}

resource "aws_vpc_security_group_egress_rule" "alb" {
  count = var.enable_backend ? 1 : 0

  security_group_id            = aws_security_group.alb[0].id
  referenced_security_group_id = aws_security_group.ecs[0].id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080

}

resource "aws_vpc_security_group_ingress_rule" "ecs" {
  count = var.enable_backend ? 1 : 0

  security_group_id            = aws_security_group.ecs[0].id
  referenced_security_group_id = aws_security_group.alb[0].id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080

}

resource "aws_vpc_security_group_egress_rule" "ecs_https" {
  count = var.enable_backend ? 1 : 0

  security_group_id = aws_security_group.ecs[0].id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443

}

resource "aws_vpc_security_group_egress_rule" "ecs_db" {
  count = var.enable_backend ? 1 : 0

  security_group_id            = aws_security_group.ecs[0].id
  referenced_security_group_id = aws_security_group.db[0].id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432

}

resource "aws_vpc_security_group_ingress_rule" "db" {
  count = var.enable_backend ? 1 : 0

  security_group_id            = aws_security_group.db[0].id
  referenced_security_group_id = aws_security_group.ecs[0].id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432

}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  count = var.enable_backend ? 1 : 0
  name  = "com.amazonaws.global.cloudfront.origin-facing"
}
