locals {
  name_prefix     = var.name
  ecr_repo_prefix = var.ecr_repo_prefix

  # SG에 열 포트(서비스에서 자동 추출)
  ecs_ports = distinct([for _, svc in var.services : svc.container_port])
}

module "vpc" {
  source = "../modules/vpc"

  name     = local.name_prefix
  vpc_cidr = var.vpc_cidr

  az_a = var.az_a
  az_c = var.az_c

  public_a_cidr = var.public_a_cidr
  public_c_cidr = var.public_c_cidr
  ecs_a_cidr    = var.ecs_a_cidr
  ecs_c_cidr    = var.ecs_c_cidr
  db_a_cidr     = var.db_a_cidr
  db_c_cidr     = var.db_c_cidr

  enable_nat_gateway = true
}

module "security" {
  source            = "../modules/security"
  name              = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  alb_ingress_cidrs = var.alb_ingress_cidrs

  ecs_from_alb_ports = local.ecs_ports
  db_port            = var.db_port
}

locals {
  alb_services = {
    for k, v in var.services : k => {
      container_port    = v.container_port
      path_prefix       = v.path_prefix
      health_check_path = "/actuator/health"
    }
  }
}

module "alb" {
  source = "../modules/alb"

  name              = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.security.alb_sg_id

  services = local.alb_services
}

module "rds" {
  source = "../modules/rds"

  name          = local.name_prefix
  db_subnet_ids = module.vpc.db_subnet_ids
  db_sg_id      = module.security.db_sg_id

  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage

  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password
  db_port     = var.db_port
}

module "ecs" {
  source = "../modules/ecs"

  name         = local.name_prefix
  cluster_name = "${local.name_prefix}-cluster"

  vpc_id                = module.vpc.vpc_id
  ecs_subnet_ids        = module.vpc.ecs_subnet_ids
  ecs_security_group_id = module.security.ecs_sg_id

  target_group_arns = module.alb.target_group_arns

  # 서비스 정의(네가 준 형태 유지)
  services = {
    for k, v in var.services :
    k => merge(v, {
      image = "${local.ecr_repo_prefix}/${k}:latest"
    })
  }

  # DB 연결값: 모든 서비스에 공통 주입 (Spring 기준 env)
  common_env = {
    SPRING_DATASOURCE_URL      = "jdbc:postgresql://${module.rds.db_address}:${var.db_port}/${var.db_name}"
    SPRING_DATASOURCE_USERNAME = var.db_username
    SPRING_DATASOURCE_PASSWORD = var.db_password

    # ✅ 자동: CloudFront 도메인 사용
    APP_CORS_ALLOWED_ORIGINS = "https://${module.frontend.cloudfront_domain_name}"
  }

  common_secrets = {
    JWT_SECRET = "/dailybriefing/jwt/secret"
  }

  depends_on = [module.alb, module.rds]
}

module "frontend" {
  source = "../modules/frontend"

  name = local.name_prefix
}
