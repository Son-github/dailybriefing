output "state_bucket_name" {
  value = aws_s3_bucket.state.id
}

output "state_operator_policy_arn" {
  value = aws_iam_policy.state_operator.arn
}
