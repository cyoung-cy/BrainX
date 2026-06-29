variable "aws_region" {
  description = "AWS region for the dev environment."
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Short project name used in AWS resource names."
  type        = string
  default     = "brainx"
}

variable "environment" {
  description = "Environment name used in AWS resource names."
  type        = string
  default     = "dev"
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the deployment role."
  type        = string
  default     = "Final-BrainX/BrainX"
}

variable "github_branch" {
  description = "GitHub branch allowed to deploy."
  type        = string
  default     = "main"
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN. Leave empty to let this stack create one."
  type        = string
  default     = ""
}

variable "github_oidc_thumbprints" {
  description = "Thumbprints for the GitHub OIDC provider when this stack creates it."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "instance_type" {
  description = "Single EC2 instance type for all dev containers."
  type        = string
  default     = "r7i.xlarge"
}

variable "ec2_root_volume_gb" {
  description = "EC2 root gp3 volume size."
  type        = number
  default     = 200
}

variable "rds_instance_class" {
  description = "RDS PostgreSQL instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "rds_allocated_storage_gb" {
  description = "RDS allocated gp3 storage."
  type        = number
  default     = 50
}

variable "rds_username" {
  description = "RDS master username. Password is managed by RDS Secrets Manager."
  type        = string
  default     = "brainx_admin"
}

variable "vpc_cidr" {
  description = "CIDR block for the dev VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "allowed_http_cidr_blocks" {
  description = "CIDR blocks allowed to access the public frontend ports."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ssm_parameter_prefix" {
  description = "SSM Parameter Store prefix for runtime app secrets."
  type        = string
  default     = "/brainx/dev"
}

variable "tags" {
  description = "Additional AWS resource tags."
  type        = map(string)
  default     = {}
}
