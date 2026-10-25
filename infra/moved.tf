# 기존 단일 Main State를 가진 경우 주소 이동만 인식하도록 선언합니다. State 명령/plan/apply는 실행하지 않았습니다.

moved {
  from = module.foundation.module.network
  to   = module.vpc
}

moved {
  from = module.foundation.aws_cloudwatch_log_group.backend
  to   = module.ecs[0].aws_cloudwatch_log_group.backend
}

moved {
  from = module.foundation.aws_ecr_repository.backend
  to   = module.ecr.aws_ecr_repository.backend
}

moved {
  from = module.foundation.aws_ecr_lifecycle_policy.backend
  to   = module.ecr.aws_ecr_lifecycle_policy.backend
}

moved {
  from = module.foundation.aws_iam_service_linked_role.ecs
  to   = module.iam.aws_iam_service_linked_role.ecs
}

moved {
  from = module.foundation.aws_iam_service_linked_role.rds
  to   = module.iam.aws_iam_service_linked_role.rds
}

moved {
  from = module.foundation.aws_cloudwatch_log_group.rds
  to   = module.rds[0].aws_cloudwatch_log_group.rds
}

moved {
  from = module.foundation.aws_s3_bucket.frontend
  to   = module.frontend.aws_s3_bucket.frontend
}

moved {
  from = module.foundation.aws_s3_bucket_versioning.frontend
  to   = module.frontend.aws_s3_bucket_versioning.frontend
}

moved {
  from = module.foundation.aws_s3_bucket_server_side_encryption_configuration.frontend
  to   = module.frontend.aws_s3_bucket_server_side_encryption_configuration.frontend
}

moved {
  from = module.foundation.aws_s3_bucket_public_access_block.frontend
  to   = module.frontend.aws_s3_bucket_public_access_block.frontend
}

moved {
  from = module.foundation.aws_cloudfront_origin_access_control.frontend
  to   = module.frontend.aws_cloudfront_origin_access_control.frontend
}

moved {
  from = module.foundation.aws_cloudfront_function.spa
  to   = module.frontend.aws_cloudfront_function.spa
}

moved {
  from = module.foundation.aws_cloudfront_response_headers_policy.security
  to   = module.frontend.aws_cloudfront_response_headers_policy.security
}

moved {
  from = module.foundation.aws_cloudfront_distribution.frontend
  to   = module.frontend.aws_cloudfront_distribution.frontend
}

moved {
  from = module.foundation.aws_s3_bucket_policy.frontend
  to   = module.frontend.aws_s3_bucket_policy.frontend
}

moved {
  from = module.foundation.aws_s3_object.runtime
  to   = module.frontend.aws_s3_object.runtime
}

moved {
  from = module.foundation.aws_iam_openid_connect_provider.github
  to   = module.iam.aws_iam_openid_connect_provider.github
}

moved {
  from = module.foundation.aws_iam_policy.task_boundary
  to   = module.iam.aws_iam_policy.task_boundary
}

moved {
  from = module.foundation.aws_iam_role.github
  to   = module.iam.aws_iam_role.github
}

moved {
  from = module.foundation.aws_iam_role_policy.frontend
  to   = module.iam.aws_iam_role_policy.frontend
}

moved {
  from = module.foundation.aws_iam_role_policy.backend
  to   = module.iam.aws_iam_role_policy.backend
}

moved {
  from = module.application[0].aws_eip.nat
  to   = module.nat[0].aws_eip.nat
}

moved {
  from = module.application[0].aws_nat_gateway.main
  to   = module.nat[0].aws_nat_gateway.main
}

moved {
  from = module.application[0].aws_route.nat
  to   = module.nat[0].aws_route.nat
}

moved {
  from = module.application[0].aws_security_group.alb
  to   = module.vpc.aws_security_group.alb[0]
}

moved {
  from = module.application[0].aws_security_group.ecs
  to   = module.vpc.aws_security_group.ecs[0]
}

moved {
  from = module.application[0].aws_security_group.db
  to   = module.vpc.aws_security_group.db[0]
}

moved {
  from = module.application[0].aws_vpc_security_group_ingress_rule.alb
  to   = module.vpc.aws_vpc_security_group_ingress_rule.alb[0]
}

moved {
  from = module.application[0].aws_vpc_security_group_egress_rule.alb
  to   = module.vpc.aws_vpc_security_group_egress_rule.alb[0]
}

moved {
  from = module.application[0].aws_vpc_security_group_ingress_rule.ecs
  to   = module.vpc.aws_vpc_security_group_ingress_rule.ecs[0]
}

moved {
  from = module.application[0].aws_vpc_security_group_egress_rule.ecs_https
  to   = module.vpc.aws_vpc_security_group_egress_rule.ecs_https[0]
}

moved {
  from = module.application[0].aws_vpc_security_group_egress_rule.ecs_db
  to   = module.vpc.aws_vpc_security_group_egress_rule.ecs_db[0]
}

moved {
  from = module.application[0].aws_vpc_security_group_ingress_rule.db
  to   = module.vpc.aws_vpc_security_group_ingress_rule.db[0]
}

moved {
  from = module.application[0].aws_db_subnet_group.main
  to   = module.rds[0].aws_db_subnet_group.main
}

moved {
  from = module.application[0].aws_db_instance.main
  to   = module.rds[0].aws_db_instance.main
}

moved {
  from = module.application[0].aws_lb.main
  to   = module.alb[0].aws_lb.main
}

moved {
  from = module.application[0].aws_lb_target_group.app
  to   = module.alb[0].aws_lb_target_group.app
}

moved {
  from = module.application[0].aws_lb_listener.https
  to   = module.alb[0].aws_lb_listener.https
}


moved {
  from = module.application[0].aws_ecs_cluster.main
  to   = module.ecs[0].aws_ecs_cluster.main
}

moved {
  from = module.application[0].aws_iam_role.execution
  to   = module.ecs[0].aws_iam_role.execution
}

moved {
  from = module.application[0].aws_iam_role.task
  to   = module.ecs[0].aws_iam_role.task
}

moved {
  from = module.application[0].aws_iam_role_policy.execution
  to   = module.ecs[0].aws_iam_role_policy.execution
}

moved {
  from = module.application[0].aws_ecs_task_definition.app
  to   = module.ecs[0].aws_ecs_task_definition.app
}

moved {
  from = module.application[0].aws_ecs_service.app
  to   = module.ecs[0].aws_ecs_service.app
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["ecs_cpu"]
  to   = module.ecs[0].aws_cloudwatch_metric_alarm.main["ecs_cpu"]
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["ecs_memory"]
  to   = module.ecs[0].aws_cloudwatch_metric_alarm.main["ecs_memory"]
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["alb_5xx"]
  to   = module.alb[0].aws_cloudwatch_metric_alarm.main["alb_5xx"]
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["target_health"]
  to   = module.alb[0].aws_cloudwatch_metric_alarm.main["target_health"]
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["response_time"]
  to   = module.alb[0].aws_cloudwatch_metric_alarm.main["response_time"]
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["rds_cpu"]
  to   = module.rds[0].aws_cloudwatch_metric_alarm.main["rds_cpu"]
}

moved {
  from = module.application[0].aws_cloudwatch_metric_alarm.main["rds_connections"]
  to   = module.rds[0].aws_cloudwatch_metric_alarm.main["rds_connections"]
}
