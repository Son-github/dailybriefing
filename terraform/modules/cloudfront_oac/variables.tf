variable "name" {
  type        = string
  description = "Resource name prefix"
}

# ---------- S3 (정적 사이트) ----------
variable "s3_bucket_id" {
  type        = string
  description = "S3 bucket id for static site"
}
variable "s3_bucket_arn" {
  type        = string
  description = "S3 bucket ARN for policy"
}
variable "s3_bucket_domain_name" {
  type        = string
  description = "S3 regional domain name (origin)"
}

# ---------- CloudFront 공통 ----------
variable "certificate_arn" {
  type        = string
  description = "ACM cert in us-east-1 for CloudFront; empty to use default CF cert"
  default     = ""
}
variable "default_root_object" {
  type        = string
  default     = "index.html"
}
variable "price_class" {
  type        = string
  default     = "PriceClass_200"
}
variable "aliases" {
  type        = list(string)
  description = "Optional custom domains for CloudFront (e.g., www.example.com)"
  default     = []
}

# ---------- API(백엔드) 라우팅 ----------
variable "enable_api_origin" {
  type        = bool
  description = "Enable /api/* routing to ALB origin"
  default     = false
}

variable "api_origin_domain_name" {
  type        = string
  description = "ALB origin domain (e.g., my-alb-xxxxx.ap-northeast-2.elb.amazonaws.com or api.example.com)"
  default     = ""
}

variable "api_origin_protocol_policy" {
  type        = string
  description = "How CF connects to ALB: http-only | https-only"
  default     = "http-only"
  validation {
    condition     = contains(["http-only","https-only"], var.api_origin_protocol_policy)
    error_message = "api_origin_protocol_policy must be one of: http-only, https-only"
  }
}

variable "api_path_pattern" {
  type        = string
  description = "Path pattern to route to ALB"
  default     = "/api/*"
}

variable "api_allowed_methods" {
  type        = list(string)
  description = "Allowed methods for API behavior"
  default     = ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"]
}
variable "api_cached_methods" {
  type        = list(string)
  description = "Cached methods for API behavior"
  default     = ["GET","HEAD","OPTIONS"]
}

variable "api_query_string" {
  type        = bool
  default     = true
}

# CloudFront가 ALB로 전달할 헤더 목록 (와일드카드 불가)
variable "api_forward_headers" {
  type        = list(string)
  description = "Headers to whitelist and forward to ALB origin (e.g., Authorization, Origin, Content-Type)"
  default     = ["Authorization", "Origin", "Content-Type", "Accept"]
}

# 쿠키를 whitelist 모드로 쓸 때 허용할 쿠키 이름들
variable "api_cookie_whitelist" {
  type        = list(string)
  description = "Cookie names to whitelist when api_forward_cookies == 'whitelist'"
  default     = []
}


variable "api_forward_cookies" {
  type        = string
  description = "Cookie forward mode: all | none | whitelist"
  default     = "all"
  validation {
    condition     = contains(["all","none","whitelist"], var.api_forward_cookies)
    error_message = "api_forward_cookies must be one of: all, none, whitelist"
  }
}

variable "api_min_ttl" {
  type    = number
  default = 0
}
variable "api_default_ttl" {
  type    = number
  default = 0
}
variable "api_max_ttl" {
  type    = number
  default = 0
}