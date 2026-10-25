# Main Root: 사용자가 요청한 8개 서비스 모듈을 직접 연결합니다. Bootstrap만 별도 State입니다.
# 이번 작업에서는 AWS 접근/plan/apply/destroy를 실행하지 않습니다.

module "vpc" {
  source             = "./modules/vpc"
  availability_zones = var.availability_zones
  enable_backend     = var.enable_backend
  project            = var.project
  region             = var.region
}

module "frontend" {
  source                = "./modules/frontend"
  allow_storage_cleanup = var.allow_storage_cleanup
  # 인증서만 요청하는 동안에는 아직 없는 API 원본을 CloudFront에 추가하지 않습니다.
  api_hostname             = var.enable_backend ? var.api_hostname : ""
  frontend_bucket_name     = var.frontend_bucket_name
  frontend_certificate_arn = local.active_frontend_certificate_arn
  frontend_hostname        = local.active_frontend_hostname
  project                  = var.project
}

module "ecr" {
  source                = "./modules/ecr"
  allow_storage_cleanup = var.allow_storage_cleanup
  project               = var.project
}

module "iam" {
  source                            = "./modules/iam"
  application_secret_arns           = values(var.application_secrets)
  aws_account_id                    = var.aws_account_id
  cloudfront_arn                    = module.frontend.cloudfront_arn
  create_github_oidc_provider       = var.create_github_oidc_provider
  create_service_linked_roles       = var.create_service_linked_roles
  ecr_arn                           = module.ecr.repository_arn
  existing_github_oidc_provider_arn = var.existing_github_oidc_provider_arn
  frontend_bucket_arn               = module.frontend.bucket_arn
  github_repository_subject         = var.github_repository_subject
  log_group_arn                     = "arn:aws:logs:${var.region}:${var.aws_account_id}:log-group:/${var.project}/backend"
  project                           = var.project
  region                            = var.region
  secret_kms_key_arns               = var.secret_kms_key_arns
}

module "nat" {
  source              = "./modules/nat"
  count               = var.enable_backend ? 1 : 0 # ECR 최초 push 전에는 Backend 비용 자원을 만들지 않는 단계 설정
  app_route_table_ids = module.vpc.app_route_table_ids
  project             = var.project
  public_subnet_ids   = module.vpc.public_subnet_ids
  depends_on          = [module.vpc] # Public IGW 및 기본 route 준비 후 NAT 생성
}

module "alb" {
  source                = "./modules/alb"
  count                 = var.enable_backend ? 1 : 0 # ECR 최초 push 전에는 Backend 비용 자원을 만들지 않는 단계 설정
  alarm_sns_topic_arns  = var.alarm_sns_topic_arns
  alb_certificate_arn   = local.active_api_certificate_arn
  alb_security_group_id = module.vpc.alb_security_group_id
  api_hostname          = var.api_hostname
  aws_account_id        = var.aws_account_id
  project               = var.project
  public_subnet_ids     = module.vpc.public_subnet_ids
  region                = var.region
  vpc_id                = module.vpc.vpc_id
}

module "rds" {
  source                      = "./modules/rds"
  count                       = var.enable_backend ? 1 : 0 # ECR 최초 push 전에는 Backend 비용 자원을 만들지 않는 단계 설정
  alarm_sns_topic_arns        = var.alarm_sns_topic_arns
  availability_zone           = var.availability_zones[0]
  database_disposal           = var.database_disposal
  db_instance_class           = var.db_instance_class
  db_name                     = var.db_name
  db_security_group_id        = module.vpc.db_security_group_id
  db_storage_gb               = var.db_storage_gb
  db_subnet_ids               = module.vpc.db_subnet_ids
  ephemeral_database_ack      = var.ephemeral_database_ack
  final_snapshot_identifier   = var.final_snapshot_identifier
  log_retention_days          = var.log_retention_days
  project                     = var.project
  restore_snapshot_identifier = var.restore_snapshot_identifier
  depends_on                  = [module.iam] # 선택적 RDS service-linked Role 선행 생성
}

module "ecs" {
  source                = "./modules/ecs"
  count                 = var.enable_backend ? 1 : 0 # ECR 최초 push 전에는 Backend 비용 자원을 만들지 않는 단계 설정
  alarm_sns_topic_arns  = var.alarm_sns_topic_arns
  app_subnet_ids        = module.vpc.app_subnet_ids
  application_secrets   = var.application_secrets
  aws_account_id        = var.aws_account_id
  db_host               = module.rds[0].db_host
  db_name               = var.db_name
  db_secret_arn         = module.rds[0].db_secret_arn
  ecr_arn               = module.ecr.repository_arn
  ecr_url               = module.ecr.repository_url
  ecs_security_group_id = module.vpc.ecs_security_group_id
  frontend_url          = module.frontend.frontend_url
  frontend_urls         = module.frontend.frontend_urls
  image_digest          = var.image_digest
  log_retention_days    = var.log_retention_days
  project               = var.project
  region                = var.region
  secret_kms_key_arns   = var.secret_kms_key_arns
  target_group_arn      = module.alb[0].target_group_arn
  task_boundary_arn     = module.iam.task_boundary_arn
  task_count            = var.task_count
  task_cpu              = var.task_cpu
  task_memory           = var.task_memory
  use_both_app_azs      = var.use_both_app_azs
  depends_on            = [module.nat, module.alb, module.iam, module.vpc] # ALB listener/NAT/SG 규칙/권한 경계가 준비된 뒤 서비스 시작
}

# [비용 주의] 수동 승인 후에만 활성화합니다. 새 State 없이 기존 Main에 9번째 모듈로 연결합니다.
module "aiops" {
  source                 = "./modules/aiops"
  count                  = var.enable_aiops && var.enable_backend ? 1 : 0
  project                = var.project
  region                 = var.region
  aws_account_id         = var.aws_account_id
  backend_log_group_name = module.ecs[0].log_group_name
  backend_log_group_arn  = module.ecs[0].log_group_arn
  ecs_cluster_arn        = module.ecs[0].cluster_arn
  ecs_service_arn        = module.ecs[0].service_arn
  ecs_service_name       = module.ecs[0].service_name
  package_path           = abspath("${path.root}/${var.aiops_package_path}")
  email                  = var.aiops_email
  openai_key_arn         = var.aiops_openai_key_arn
  secret_kms_key_arn     = var.aiops_secret_kms_key_arn
  settings               = var.aiops_settings
}
