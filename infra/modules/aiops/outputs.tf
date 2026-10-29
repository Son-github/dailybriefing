# 공개 식별자만 출력합니다. 수신 이메일/키 값은 State 접근 권한으로 보호합니다.
output "function_name" { value = aws_lambda_function.analyzer.function_name }
output "topic_arn" { value = aws_sns_topic.alerts.arn }
output "table_name" { value = aws_dynamodb_table.state.name }

output "summary_schedule_group" { value = aws_scheduler_schedule_group.summary.name }
