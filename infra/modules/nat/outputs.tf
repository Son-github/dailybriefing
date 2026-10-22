# Root가 다른 모듈과 연결할 식별자입니다. DB password/Secret 원문은 출력하지 않습니다.
output "nat_gateway_id" { value = aws_nat_gateway.main.id }
output "eip_allocation_id" { value = aws_eip.nat.id }
