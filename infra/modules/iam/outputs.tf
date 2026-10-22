# Root가 다른 모듈과 연결할 식별자입니다. DB password/Secret 원문은 출력하지 않습니다.
output "task_boundary_arn" { value = aws_iam_policy.task_boundary.arn }
output "github_roles" { value = { for key, role in aws_iam_role.github : key => role.arn } }
