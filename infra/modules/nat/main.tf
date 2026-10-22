# Private App의 외부 HTTPS 통신을 위한 NAT/EIP/route입니다. 시간/트래픽 비용이 발생합니다.
locals { name = "${var.project}-live" }
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {

  allocation_id = aws_eip.nat.id
  subnet_id     = var.public_subnet_ids[0]
  tags          = { Name = "${local.name}-nat" }

}

resource "aws_route" "nat" {

  count                  = 2
  route_table_id         = var.app_route_table_ids[count.index]
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id

}
