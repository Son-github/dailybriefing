data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "site" {
  bucket = "${var.name}-frontend-${data.aws_caller_identity.current.account_id}"
}

# 퍼블릭 차단 (CloudFront OAC로만 접근)
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# (선택) 정적 웹 호스팅 기능은 굳이 안 켜도 됨(OAC 접근이므로)
# SPA 라우팅은 CloudFront custom error response로 처리

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.name}-oac"
  description                       = "OAC for private S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_cache_policy" "api_disabled" {
  name        = "${var.name}-api-cache-disabled"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_origin_request_policy" "api" {
  name = "${var.name}-api-origin-request"

  cookies_config { cookie_behavior = "all" }
  query_strings_config { query_string_behavior = "all" }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Authorization",
        "Content-Type",
        "Origin",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method"
      ]
    }
  }
}

resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.name}-spa-rewrite"
  runtime = "cloudfront-js-1.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      if (!request.uri.includes('.')) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = var.index_document
  price_class         = var.price_class

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-origin-${aws_s3_bucket.site.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-origin-${aws_s3_bucket.site.id}"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # 이전에는 모든 경로가 S3로 향했다. API 경로만 ALB로 보내고 캐시는 끈다.
  dynamic "ordered_cache_behavior" {
    for_each = toset(["/auth*", "/exchange*", "/weather*", "/news*"])
    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = "alb-api"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods           = ["GET", "HEAD", "OPTIONS"]
      cache_policy_id          = aws_cloudfront_cache_policy.api_disabled.id
      origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
      compress                 = true
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# OAC가 S3를 읽을 수 있도록 버킷 정책 부여
data "aws_iam_policy_document" "bucket_policy" {
  statement {
    sid = "AllowCloudFrontRead"

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}
