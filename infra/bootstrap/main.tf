# [주의] S3 저장/요청 비용이 발생합니다. bootstrap은 LIVE 종료 대상이 아닙니다.
resource "aws_s3_bucket" "state" {

  bucket        = var.state_bucket_name
  force_destroy = false
  lifecycle {
    prevent_destroy = true
  }

}

resource "aws_s3_bucket_versioning" "state" {

  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }

}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {

  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }

  }

}

resource "aws_s3_bucket_public_access_block" "state" {

  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}

data "aws_iam_policy_document" "tls" {

  statement {

    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
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

resource "aws_s3_bucket_policy" "tls" {

  bucket = aws_s3_bucket.state.id
  policy = data.aws_iam_policy_document.tls.json

}

# 관리자에게 부착할 선택적 정책입니다. 계정 전체 S3 권한을 주지 않습니다.
resource "aws_iam_policy" "state_operator" {

  name = "${var.project}-state-operator"
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["s3:ListBucket"], Resource = aws_s3_bucket.state.arn },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.state.arn}/*" },
    { Effect = "Allow", Action = ["s3:DeleteObject"], Resource = "${aws_s3_bucket.state.arn}/*.tflock" }
  ] })

}
