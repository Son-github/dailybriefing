output "distribution_id" {
  value       = aws_cloudfront_distribution.cdn.id
  description = "CloudFront distribution ID"
}

output "distribution_arn" {
  value       = aws_cloudfront_distribution.cdn.arn
  description = "CloudFront distribution ARN"
}

output "domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront domain name"
}

output "hosted_zone_id" {
  value       = aws_cloudfront_distribution.cdn.hosted_zone_id
  description = "Route53 hosted zone id for CloudFront"
}
