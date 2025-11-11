data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name_prefix = var.name_prefix
  ecr_repo_prefix = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/dailybriefing"
}

# ---------------- VPC ----------------
module "vpc" {
  source = "../modules/vpc"

  name     = local.name_prefix
  vpc_cidr = "10.2.0.0/16"

  az_a = "ap-northeast-2a"
  az_c = "ap-northeast-2c"

  # Public (ALB)
  public_a_cidr = "10.2.1.0/24"
  public_c_cidr = "10.2.11.0/24"

  # ECS Private (2AZ)  👈 기존 ecs_cidr → ecs_a_cidr / ecs_c_cidr 로 분리
  ecs_a_cidr = "10.2.2.0/24"
  ecs_c_cidr = "10.2.12.0/24"

  # DB Private (2AZ)
  db_a_cidr = "10.2.3.0/24"
  db_c_cidr = "10.2.4.0/24"

  # (옵션) 모듈 변수에 선언돼 있어야 함. 없다면 이 3개 줄은 지워도 됨.
  enable_vpc_endpoints       = false
  create_sg_bundle           = true
  alb_ingress_cidrs          = ["0.0.0.0/0"]

  # ALB → ECS 허용 포트
  ecs_ingress_from_alb_ports = [8081, 8082, 8083, 8084]

  # DB 포트
  db_port = 5432
}

# ---------------- ALB ----------------
module "alb" {
  source = "../modules/alb"

  name            = local.name_prefix
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  alb_sg_id       = module.vpc.alb_sg_id
  certificate_arn = var.alb_certificate_arn

  enable_access_logs = false
  access_logs_bucket = null
  access_logs_prefix = "alb/"

  routes = {
    auth-service = {
      path = "/api/auth/*"
      port = 8081
    }
    exchange-service = {
      path = "/api/exchange/*"
      port = 8082
    }
    weather-service = {
      path = "/api/weather/*"
      port = 8083
    }
    news-service = {
      path = "/api/news/*"
      port = 8084
    }
  }
}

# ---------------- ECS ----------------
module "ecs" {
  source = "../modules/ecs"

  name                  = local.name_prefix
  cluster_name          = "${local.name_prefix}-cluster"

  vpc_id                = module.vpc.vpc_id
  ecs_subnet_ids        = module.vpc.ecs_subnet_ids          # ✅ 2개 AZ 프라이빗 서브넷
  ecs_security_group_id = module.vpc.ecs_sg_id
  # db_sg_id는 VPC 모듈이 DB SG를 만들고 rule까지 관리하므로 굳이 전달 불필요

  target_group_arns     = module.alb.target_group_arns       # {service = tg_arn}

  # 4개 서비스 모두 DB 연결 ENV 추가
  services = {
    auth-service = {
      image          = "${local.ecr_repo_prefix}/auth-service:latest"
      container_port = 8081
      desired_count  = 1
      cpu            = 256
      memory         = 512
      env = {
        SPRING_PROFILES_ACTIVE      = "dev"
        SPRING_DATASOURCE_URL       = "jdbc:postgresql://${module.rds.endpoint}:5432/dashboard?sslmode=require"
        SPRING_DATASOURCE_USERNAME  = "appuser"
        SPRING_DATASOURCE_PASSWORD  = "11111111"
        SERVER_PORT                 = "8081"
        # (선택) JVM 메모리 튜닝: 작은 메모리에서 안정화
        # JAVA_TOOL_OPTIONS           = "-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=50 -XX:MaxMetaspaceSize=128m"
      }
    }

    exchange-service = {
      image          = "${local.ecr_repo_prefix}/exchange-service:latest"
      container_port = 8082
      desired_count  = 1
      cpu            = 256
      memory         = 512
      env = {
        SPRING_PROFILES_ACTIVE      = "dev"
        SPRING_DATASOURCE_URL       = "jdbc:postgresql://${module.rds.endpoint}:5432/dashboard?sslmode=require"
        SPRING_DATASOURCE_USERNAME  = "appuser"
        SPRING_DATASOURCE_PASSWORD  = "11111111"
        SERVER_PORT                 = "8082"
        # JAVA_TOOL_OPTIONS           = "-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=50 -XX:MaxMetaspaceSize=128m"
      }
    }

    weather-service = {
      image          = "${local.ecr_repo_prefix}/weather-service:latest"
      container_port = 8083
      desired_count  = 1
      cpu            = 256
      memory         = 512
      env = {
        SPRING_PROFILES_ACTIVE      = "dev"
        SPRING_DATASOURCE_URL       = "jdbc:postgresql://${module.rds.endpoint}:5432/dashboard?sslmode=require"
        SPRING_DATASOURCE_USERNAME  = "appuser"
        SPRING_DATASOURCE_PASSWORD  = "11111111"
        SERVER_PORT                 = "8083"
        # JAVA_TOOL_OPTIONS           = "-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=50 -XX:MaxMetaspaceSize=128m"
      }
    }

    news-service = {
      image          = "${local.ecr_repo_prefix}/news-service:latest"
      container_port = 8084
      desired_count  = 1
      cpu            = 256
      memory         = 512
      env = {
        SPRING_PROFILES_ACTIVE      = "dev"
        SPRING_DATASOURCE_URL       = "jdbc:postgresql://${module.rds.endpoint}:5432/dashboard?sslmode=require"
        SPRING_DATASOURCE_USERNAME  = "appuser"
        SPRING_DATASOURCE_PASSWORD  = "11111111"
        SERVER_PORT                 = "8084"
        # JAVA_TOOL_OPTIONS           = "-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=50 -XX:MaxMetaspaceSize=128m"
      }
    }
  }

  enable_autoscaling = false
  autoscaling = {
    min_capacity = 1
    max_capacity = 2
    target_cpu   = 60
  }

  depends_on = [module.alb]
}

# ---------------- RDS(Postgres) ----------------
module "rds" {
  source = "../modules/rds"

  name          = local.name_prefix
  db_subnet_ids = module.vpc.db_subnet_ids
  rds_sg_id     = module.vpc.db_sg_id

  db_name     = "dashboard"
  db_username = "appuser"
  db_password = "11111111"   # dev only

  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  storage_encrypted       = true
  backup_retention_period = 7
  deletion_protection     = false
  apply_immediately       = true
  publicly_accessible     = false
  multi_az                = false
  skip_final_snapshot     = true
}

# ---------------- Frontend ----------------
module "s3_site" {
  source               = "../modules/s3_site"
  name                 = local.name_prefix
  bucket_force_destroy = true
  enable_versioning    = false
}

module "cloudfront" {
  source                = "../modules/cloudfront_oac"
  name                  = local.name_prefix

  # S3
  s3_bucket_id          = module.s3_site.bucket_id
  s3_bucket_arn         = module.s3_site.bucket_arn
  s3_bucket_domain_name = module.s3_site.bucket_regional_domain_name

  # CF 인증서(us-east-1) - 프론트 도메인(CloudFront)용
  certificate_arn       = var.frontend_certificate_arn
  default_root_object   = "index.html"
  price_class           = "PriceClass_200"

  # ✅ API 라우팅 (CloudFront → ALB: http-only)
  enable_api_origin          = true
  api_origin_domain_name     = module.alb.alb_dns_name
  api_origin_protocol_policy = "http-only"

  # ✅ 프리플라이트/인증 헤더/쿠키/쿼리 전달
  api_query_string      = true
  api_forward_cookies   = "all"  # 세션/로그인 대응
  api_forward_headers   = [
    "Authorization",
    "Origin",
    "Content-Type",
    "Accept",
    "X-Requested-With"
  ]

  # ✅ API 캐시 끄기 (즉시 반영)
  api_min_ttl     = 0
  api_default_ttl = 0
  api_max_ttl     = 0
}
