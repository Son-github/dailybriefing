locals {
  use_default_cert = var.certificate_arn == null || var.certificate_arn == ""
}

# S3용 OAC
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.name}-oac"
  description                       = "OAC for ${var.name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  price_class         = var.price_class
  default_root_object = var.default_root_object
  aliases             = var.aliases

  # ---------- Origin: S3 (정적 웹) ----------
  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_id                = "s3-${var.s3_bucket_id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # ---------- Origin: ALB (API) [옵션] ----------
  dynamic "origin" {
    for_each = var.enable_api_origin ? [1] : []
    content {
      origin_id   = "alb-origin"
      domain_name = var.api_origin_domain_name
      custom_origin_config {
        origin_protocol_policy = var.api_origin_protocol_policy   # "http-only" or "https-only"
        http_port              = 80
        https_port             = 443
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  # ---------- 기본 캐시 동작: S3 ----------
  default_cache_behavior {
    target_origin_id       = "s3-${var.s3_bucket_id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # ---------- 경로 기반 동작: /api/* → ALB ----------
  dynamic "ordered_cache_behavior" {
    for_each = var.enable_api_origin ? [1] : []
    content {
      path_pattern           = var.api_path_pattern
      target_origin_id       = "alb-origin"
      viewer_protocol_policy = "redirect-to-https"

      allowed_methods  = var.api_allowed_methods
      cached_methods   = var.api_cached_methods
      compress         = true

      forwarded_values {
        query_string = var.api_query_string

        # ⚠️ CloudFront forwarded_values.headers 는 "*" 와일드카드가 없습니다.
        # 필요한 헤더만 화이트리스트로 지정하세요.
        headers = var.api_forward_headers

        cookies {
          forward           = var.api_forward_cookies # "all" | "none" | "whitelist"
          # ⚠️ whitelisted_names 는 block가 아니라 attribute 입니다.
          whitelisted_names = var.api_forward_cookies == "whitelist" ? var.api_cookie_whitelist : []
        }
      }

      # API는 캐시 끄기
      min_ttl     = var.api_min_ttl
      default_ttl = var.api_default_ttl
      max_ttl     = var.api_max_ttl
    }
  }

  # ---------- SPA 라우팅을 위한 에러 핸들 ----------
  custom_error_response {
    error_code            = 403
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.use_default_cert
    acm_certificate_arn            = local.use_default_cert ? null : var.certificate_arn
    ssl_support_method             = local.use_default_cert ? null : "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.name}-cdn"
  }
}

# S3 버킷 정책: CloudFront(OAC)에서만 읽기 허용
data "aws_iam_policy_document" "site" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${var.s3_bucket_arn}/*"]

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
  bucket = var.s3_bucket_id
  policy = data.aws_iam_policy_document.site.json
}
