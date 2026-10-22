# GitHub OIDC 앱 배포 역할과 ECS 공통 권한 경계를 관리합니다. CI에는 Terraform State/인프라 변경 권한이 없습니다.
# 정확한 저장소/Environment OIDC와 앱 배포 권한만 정의합니다. CI에 State/IaC 변경 권한을 주지 않습니다.
resource "aws_iam_openid_connect_provider" "github" {

  count          = var.create_github_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

}

locals {

  oidc_arn     = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_github_oidc_provider_arn
  environments = toset(["frontend", "backend"])
  repo_arn     = var.ecr_arn

}

# ECS Task/Execution Role의 권한 상한입니다. CI에는 Role 생성/수정 권한을 주지 않습니다.
resource "aws_iam_policy" "task_boundary" {

  name = "${var.project}-task-boundary"
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"], Resource = local.repo_arn },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${var.log_group_arn}:*" },
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"], Resource = concat(["arn:aws:secretsmanager:${var.region}:${var.aws_account_id}:secret:rds!db-*"], var.application_secret_arns) }
    ], length(var.application_secret_arns) == 0 ? [] : [
    { Effect = "Allow", Action = ["ssm:GetParameters"], Resource = var.application_secret_arns }
    ], length(var.secret_kms_key_arns) == 0 ? [] : [
    { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secret_kms_key_arns }
  ]) })

}

resource "aws_iam_role" "github" {

  for_each = local.environments
  name     = "${var.project}-github-${each.key}"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Federated = local.oidc_arn }, Action = "sts:AssumeRoleWithWebIdentity", Condition = { StringEquals = {
    "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub" = "${var.github_repository_subject}:environment:${each.key}"
  } } }] })
  lifecycle {

    precondition {

      condition     = local.oidc_arn != ""
      error_message = "기존 GitHub OIDC ARN 또는 생성 설정이 필요합니다."

    }

  }

}

resource "aws_iam_role_policy" "frontend" {

  role = aws_iam_role.github["frontend"].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["s3:ListBucket"], Resource = var.frontend_bucket_arn },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], Resource = "${var.frontend_bucket_arn}/*" },
    { Effect = "Deny", Action = ["s3:PutObject", "s3:DeleteObject"], Resource = "${var.frontend_bucket_arn}/runtime-config.json" },
    { Effect = "Allow", Action = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation", "cloudfront:GetDistribution"], Resource = var.cloudfront_arn }
  ] })

}


# 앱 배포만 허용합니다. Terraform State, VPC/NAT/RDS/IAM 생성·삭제 권한은 없습니다.
resource "aws_iam_role_policy" "backend" {
  role = aws_iam_role.github["backend"].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:DescribeRepositories", "ecr:DescribeImages", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"], Resource = local.repo_arn },
    { Effect = "Allow", Action = ["ecs:DescribeServices", "ecs:UpdateService"], Resource = "arn:aws:ecs:${var.region}:${var.aws_account_id}:service/${var.project}-live/backend" },
    { Effect = "Allow", Action = ["ecs:DescribeTaskDefinition"], Resource = "*" },
    { Effect = "Allow", Action = ["ecs:RegisterTaskDefinition"], Resource = "*", Condition = { StringEquals = { "aws:RequestedRegion" = var.region } } },
    { Effect = "Allow", Action = ["iam:PassRole"], Resource = ["arn:aws:iam::${var.aws_account_id}:role/${var.project}-live-execution", "arn:aws:iam::${var.aws_account_id}:role/${var.project}-live-task"], Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } } },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${var.frontend_bucket_arn}/runtime-config.json" },
    { Effect = "Allow", Action = ["cloudfront:GetDistribution", "cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"], Resource = var.cloudfront_arn }
  ] })
}


resource "aws_iam_service_linked_role" "ecs" {

  count            = var.create_service_linked_roles ? 1 : 0
  aws_service_name = "ecs.amazonaws.com"

}

resource "aws_iam_service_linked_role" "rds" {

  count            = var.create_service_linked_roles ? 1 : 0
  aws_service_name = "rds.amazonaws.com"

}
