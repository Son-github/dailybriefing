name            = "dailybriefing"
ecr_repo_prefix = "953013523670.dkr.ecr.ap-northeast-2.amazonaws.com/dailybriefing"

az_a = "ap-northeast-2a"
az_c = "ap-northeast-2c"

vpc_cidr      = "10.0.0.0/16"
public_a_cidr = "10.0.1.0/24"
public_c_cidr = "10.0.3.0/24"
ecs_a_cidr    = "10.0.2.0/24"
ecs_c_cidr    = "10.0.4.0/24"
db_a_cidr     = "10.0.10.0/24"
db_c_cidr     = "10.0.12.0/24"

db_password = "진짜_강력한_비번_넣기"

services = {
  auth-service = {
    container_port     = 8081
    desired_count      = 1
    cpu                = 256
    memory             = 512
    path_prefix        = "/auth"
    health_check_path  = "/actuator/health"
    env = {
      SPRING_PROFILES_ACTIVE = "prod"
      SERVER_PORT            = "8081"
    }
  }

  exchange-service = {
    container_port     = 8082
    desired_count      = 1
    cpu                = 256
    memory             = 512
    path_prefix        = "/exchange"
    health_check_path  = "/actuator/health"
    env = {
      SPRING_PROFILES_ACTIVE = "prod"
      SERVER_PORT            = "8082"
    }
  }

  weather-service = {
    container_port     = 8083
    desired_count      = 1
    cpu                = 256
    memory             = 512
    path_prefix        = "/weather"
    health_check_path  = "/actuator/health"
    env = {
      SPRING_PROFILES_ACTIVE = "prod"
      SERVER_PORT            = "8083"
    }
  }

  news-service = {
    container_port     = 8084
    desired_count      = 1
    cpu                = 256
    memory             = 512
    path_prefix        = "/news"
    health_check_path  = "/actuator/health"
    env = {
      SPRING_PROFILES_ACTIVE = "prod"
      SERVER_PORT            = "8084"
    }
  }
}
