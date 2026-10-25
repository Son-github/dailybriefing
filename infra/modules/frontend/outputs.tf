# Root가 다른 모듈과 연결할 식별자입니다. DB password/Secret 원문은 출력하지 않습니다.
output "frontend_bucket" { value = aws_s3_bucket.frontend.id }
output "bucket_arn" { value = aws_s3_bucket.frontend.arn }
output "cloudfront_id" { value = aws_cloudfront_distribution.frontend.id }
output "cloudfront_domain_name" { value = aws_cloudfront_distribution.frontend.domain_name }
output "cloudfront_arn" { value = aws_cloudfront_distribution.frontend.arn }
output "frontend_url" { value = "https://${var.frontend_hostname == "" ? aws_cloudfront_distribution.frontend.domain_name : var.frontend_hostname}" }
output "frontend_urls" { value = distinct(concat(["https://${aws_cloudfront_distribution.frontend.domain_name}"], var.frontend_hostname == "" ? [] : ["https://${var.frontend_hostname}"])) }
