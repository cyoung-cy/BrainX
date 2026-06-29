output "aws_region" {
  value = var.aws_region
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}

output "ec2_instance_id" {
  value = aws_instance.app.id
}

output "ec2_public_ip" {
  value = aws_eip.app.public_ip
}

output "main_public_base_url" {
  value = "http://${aws_eip.app.public_ip}"
}

output "admin_public_base_url" {
  value = "http://${aws_eip.app.public_ip}:8081"
}

output "artifact_bucket_name" {
  value = aws_s3_bucket.deploy_artifacts.bucket
}

output "ecr_registry" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "ecr_repository_urls" {
  value = {
    for name, repository in aws_ecr_repository.services : name => repository.repository_url
  }
}

output "rds_address" {
  value = aws_db_instance.postgres.address
}

output "rds_port" {
  value = aws_db_instance.postgres.port
}

output "rds_secret_arn" {
  value     = aws_db_instance.postgres.master_user_secret[0].secret_arn
  sensitive = true
}

output "ssm_parameter_prefix" {
  value = var.ssm_parameter_prefix
}
