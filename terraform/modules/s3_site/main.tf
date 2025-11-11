resource "aws_s3_bucket" "site" {
  bucket        = "${var.name}-web"
  force_destroy = var.bucket_force_destroy

  tags = {
    Name = "${var.name}-web"
  }
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "site" {
  count  = var.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.site.id

  versioning_configuration {
    status = "Enabled"
  }
}
