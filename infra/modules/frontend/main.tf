# S3/OAC/CloudFront/SPA/공개 runtime를 관리합니다. Main 전체 삭제 시 정적 사이트도 종료됩니다.
# [삭제 주의] 기본적으로 비어 있지 않은 버킷 삭제는 실패합니다. 버전/삭제 마커까지 검토 후 정리하거나 allow_storage_cleanup을 명시하세요.
resource "aws_s3_bucket" "frontend" {

  bucket        = var.frontend_bucket_name
  force_destroy = var.allow_storage_cleanup

}

resource "aws_s3_bucket_versioning" "frontend" {

  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }

}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {

  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }

  }

}

resource "aws_s3_bucket_public_access_block" "frontend" {

  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}

resource "aws_cloudfront_origin_access_control" "frontend" {

  name                              = "${var.project}-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"

}

# SPA의 실제 화면 경로만 rewrite. /assets/*, 파일 확장자, /api/* 오류는 index.html로 바꾸지 않습니다.
resource "aws_cloudfront_function" "spa" {

  name    = "${var.project}-spa"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/spa-router.js")

}

resource "aws_cloudfront_response_headers_policy" "security" {

  name = "${var.project}-security"
  security_headers_config {

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true

    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true

    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true

    }

    content_security_policy {

      content_security_policy = "default-src 'self'; script-src 'self' https://dapi.kakao.com https://t1.daumcdn.net; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; connect-src 'self' https://dapi.kakao.com https://*.daumcdn.net; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      override                = true

    }

  }

}

# AWS 관리 정책 ID는 공식 목록과 대조합니다. fmt/validate는 ID의 실제 존재 여부까지 확인하지 않습니다.
# https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
resource "aws_cloudfront_distribution" "frontend" {

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  aliases             = var.frontend_hostname == "" ? [] : [var.frontend_hostname]
  origin {

    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id

  }

  dynamic "origin" {

    for_each = var.api_hostname == "" ? [] : [var.api_hostname]
    content {

      domain_name = origin.value
      origin_id   = "api"
      custom_origin_config {

        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]

      }

    }

  }

  default_cache_behavior {

    target_origin_id           = "frontend"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed CachingDisabled: HTML/런타임 설정 stale 방지
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa.arn

    }

  }

  ordered_cache_behavior {

    path_pattern               = "/assets/*"
    target_origin_id           = "frontend"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed CachingOptimized: Vite hash assets only
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

  }

  dynamic "ordered_cache_behavior" {

    for_each = var.api_hostname == "" ? [] : [true]
    content {

      path_pattern               = "/api/*"
      target_origin_id           = "api"
      viewer_protocol_policy     = "https-only"
      allowed_methods            = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
      cached_methods             = ["GET", "HEAD"]
      cache_policy_id            = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
      origin_request_policy_id   = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader: Authorization/Cookie/CSRF 전달
      response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    }

  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }

  }

  viewer_certificate {

    cloudfront_default_certificate = var.frontend_hostname == ""
    acm_certificate_arn            = var.frontend_hostname == "" ? null : var.frontend_certificate_arn
    ssl_support_method             = var.frontend_hostname == "" ? null : "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"

  }

  lifecycle {
    precondition {

      condition     = var.frontend_hostname == "" || can(regex("^arn:aws:acm:us-east-1:", var.frontend_certificate_arn))
      error_message = "사용자 frontend 도메인에는 us-east-1 ACM 인증서가 필요합니다."

    }

  }

}

data "aws_iam_policy_document" "frontend_bucket" {

  statement {

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]

    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]

    }

  }

  statement {

    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.frontend.arn, "${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]

    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]

    }

  }

}

resource "aws_s3_bucket_policy" "frontend" {

  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json

}

resource "aws_s3_object" "runtime" {
  bucket        = aws_s3_bucket.frontend.id
  key           = "runtime-config.json"
  content_type  = "application/json"
  cache_control = "no-store, max-age=0"
  content       = jsonencode({ schemaVersion = 1, mode = "STATIC_DEMO", liveEnabled = false, apiBase = "/api/v1", kakaoMapKey = "" })
  lifecycle { ignore_changes = [content] }
}
