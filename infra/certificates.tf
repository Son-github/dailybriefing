# 외부 DNS이므로 두 단계로 적용합니다.
# 1) domain_enabled=false: 요청만 하고 CNAME을 출력합니다. Pending 검증을 기다리지 않습니다.
# 2) 가비아에 CNAME 등록 후 true: ACM 검증 완료를 기다린 뒤 CloudFront에 연결합니다.
resource "aws_acm_certificate" "frontend" {
  count             = var.manage_frontend_certificate ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.frontend_hostname
  validation_method = "DNS"

  options {
    export = "DISABLED"
  }

  lifecycle {
    create_before_destroy = true
    precondition {
      condition     = var.frontend_hostname != "" && var.frontend_certificate_arn == ""
      error_message = "자동 인증서 관리 시 frontend_hostname을 입력하고 frontend_certificate_arn은 비워 주세요."
    }
  }
}

# 이 리소스는 가비아 레코드를 생성하지 않습니다. 공개 DNS에서 검증된 발급 완료만 기다립니다.
resource "aws_acm_certificate_validation" "frontend" {
  count           = var.manage_frontend_certificate && var.frontend_domain_enabled ? 1 : 0
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = [
    for option in aws_acm_certificate.frontend[0].domain_validation_options : option.resource_record_name
  ]
  timeouts {
    create = "10m"
  }
}

locals {
  active_frontend_hostname = var.frontend_domain_enabled ? var.frontend_hostname : ""
  # 검증 완료 리소스의 ARN을 참조하여 Pending 인증서가 CloudFront에 먼저 연결되지 않게 합니다.
  active_frontend_certificate_arn = !var.frontend_domain_enabled ? "" : (
    var.manage_frontend_certificate ? aws_acm_certificate_validation.frontend[0].certificate_arn : var.frontend_certificate_arn
  )
}
