# BrainX AWS Dev Deployment

이 디렉토리는 BrainX 개발환경을 AWS에 배포하기 위한 독립 인프라/CI 설정이다. 기존 애플리케이션 소스는 수정하지 않고, GitHub Actions + ECR + EC2 SSM + Docker Compose로 배포한다.

## Architecture

- Region: `ap-northeast-2`
- Compute: single EC2 `r7i.xlarge` with Docker, 32 GiB RAM, 8 GiB swap
- Database: one RDS PostgreSQL instance, service-specific logical databases
- Container runtime on EC2:
  - `gateway-service`, `user-service`, `workspace-service`, `ingestion-service`, `commerce-service`, `admin-service`, `intelligence-service`
  - `frontend`, `admin-frontend`
  - `redis`, `neo4j`, `qdrant`, `kafka`, `caddy`
- Public entry:
  - user frontend: `http://<ec2-eip>/`
  - admin frontend: `http://<ec2-eip>:8081/`
  - `/api/v1/ai/*`, `/api/v1/intelligence/*`, `/api/v1/notes/*/summary` route directly to Intelligence-Service through Caddy.
  - other `/api/v1/*` routes go to Gateway-Service.

## Terraform

```powershell
cd C:\Edu\final-project\BrainX\infra\aws-dev\terraform
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

If a GitHub OIDC provider already exists in the AWS account, set `github_oidc_provider_arn` in `terraform.tfvars`. GitHub's OIDC provider is account-wide and should not be created repeatedly.

Terraform state is stored in the S3 backend declared in `terraform/backend.tf`:

- Bucket: `brainx-dev-terraform-state-049882582319-ap-northeast-2`
- Key: `brainx/dev/terraform.tfstate`
- Locking: native S3 lockfile with `use_lockfile = true`

The state bucket is bootstrapped outside this stack and has versioning, AES256 server-side encryption, and public access block enabled. Keep `terraform.tfstate` and `tfplan` files local-only; they are intentionally ignored.

## GitHub Repository Variables

The deploy workflow uses GitHub OIDC and does not require AWS access key secrets. After `terraform apply`, set these repository variables:

```powershell
gh variable set AWS_REGION --body "$(terraform output -raw aws_region)"
gh variable set AWS_ROLE_TO_ASSUME --body "$(terraform output -raw github_actions_role_arn)"
gh variable set AWS_DEV_INSTANCE_ID --body "$(terraform output -raw ec2_instance_id)"
gh variable set AWS_DEV_ARTIFACT_BUCKET --body "$(terraform output -raw artifact_bucket_name)"
gh variable set AWS_ECR_REGISTRY --body "$(terraform output -raw ecr_registry)"
gh variable set AWS_DEV_RDS_SECRET_ARN --body "$(terraform output -raw rds_secret_arn)"
gh variable set AWS_DEV_RDS_HOST --body "$(terraform output -raw rds_address)"
gh variable set AWS_DEV_RDS_PORT --body "$(terraform output -raw rds_port)"
gh variable set AWS_DEV_SSM_PARAMETER_PREFIX --body "$(terraform output -raw ssm_parameter_prefix)"
gh variable set AWS_DEV_PUBLIC_BASE_URL --body "$(terraform output -raw main_public_base_url)"
gh variable set AWS_DEV_ADMIN_PUBLIC_BASE_URL --body "$(terraform output -raw admin_public_base_url)"
```

## AWS SSM Runtime Secrets

Runtime app secrets are read by EC2 from Parameter Store. Use `SecureString` unless the value is intentionally public.

Required:

```powershell
aws ssm put-parameter --name /brainx/dev/JWT_SECRET --type SecureString --value "<32+ byte jwt secret>"
aws ssm put-parameter --name /brainx/dev/SERVICE_TOKEN --type SecureString --value "<internal service token>"
aws ssm put-parameter --name /brainx/dev/NEO4J_PASSWORD --type SecureString --value "<neo4j password>"
aws ssm put-parameter --name /brainx/dev/SEED_ADMIN_PASSWORD --type SecureString --value "<initial admin password>"
```

Optional but needed for full product behavior:

```powershell
aws ssm put-parameter --name /brainx/dev/OPENAI_API_KEY --type SecureString --value "<openai api key>"
aws ssm put-parameter --name /brainx/dev/VOYAGE_API_KEY --type SecureString --value "<voyage api key>"
aws ssm put-parameter --name /brainx/dev/TOSS_CLIENT_KEY --type SecureString --value "<toss client key>"
aws ssm put-parameter --name /brainx/dev/TOSS_SECRET_KEY --type SecureString --value "<toss secret key>"
aws ssm put-parameter --name /brainx/dev/TOSS_CONFIRM_URL --type SecureString --value "https://api.tosspayments.com/v1/payments/confirm"
aws ssm put-parameter --name /brainx/dev/GOOGLE_CLIENT_ID --type SecureString --value "<google client id>"
aws ssm put-parameter --name /brainx/dev/GOOGLE_CLIENT_SECRET --type SecureString --value "<google client secret>"
aws ssm put-parameter --name /brainx/dev/KAKAO_CLIENT_ID --type SecureString --value "<kakao rest api key>"
aws ssm put-parameter --name /brainx/dev/KAKAO_CLIENT_SECRET --type SecureString --value "<kakao client secret or empty>"
aws ssm put-parameter --name /brainx/dev/NAVER_CLIENT_ID --type SecureString --value "<naver client id>"
aws ssm put-parameter --name /brainx/dev/NAVER_CLIENT_SECRET --type SecureString --value "<naver client secret>"
aws ssm put-parameter --name /brainx/dev/MAIL_USERNAME --type SecureString --value "<smtp username>"
aws ssm put-parameter --name /brainx/dev/MAIL_PASSWORD --type SecureString --value "<smtp password>"
aws ssm put-parameter --name /brainx/dev/MAIL_FROM --type SecureString --value "<sender email>"
```

Optional admin seed overrides:

```powershell
aws ssm put-parameter --name /brainx/dev/SEED_ADMIN_LOGIN_ID --type SecureString --value "admin"
aws ssm put-parameter --name /brainx/dev/SEED_ADMIN_NAME --type SecureString --value "BrainX Admin"
```

The RDS master username/password is generated and stored by AWS Secrets Manager through `manage_master_user_password`; do not copy it into GitHub secrets.

## CI/CD Behavior

Workflow: `.github/workflows/brainx-dev-deploy.yml`

- Push to `main` detects changed paths and builds only affected images.
- `workflow_dispatch` can deploy all services or a specific service list.
- Image tags:
  - immutable: commit SHA
  - moving: `dev-latest`
- Deploy uses SSM `AWS-RunShellScript`; no SSH key or port 22 is required.
- Remote deploy prints SSM stdout/stderr, `docker compose ps`, and endpoint checks.

Path mapping:

| Path | Rebuilt service |
| --- | --- |
| `brainX_back/Gateway-Service/**` | `gateway-service` |
| `brainX_back/User-Service/**` | `user-service` |
| `brainX_back/Workspace-Service/**` | `workspace-service` |
| `brainX_back/Ingestion-Service/**` | `ingestion-service` |
| `brainX_back/Commerce-Service/**` | `commerce-service` |
| `brainX_back/Admin-Service/**` | `admin-service` |
| `brainX_back/Intelligence-Service/**` | `intelligence-service` |
| `brainx-next/**` | `frontend` |
| `brainx-admin-next/**` | `admin-frontend` |
| `contracts-v2/**` | `intelligence-service`, `frontend` |
| `infra/aws-dev/**` or workflow file | deploy config refresh |

For first deployment, run the workflow manually with `deploy_all=true` so every ECR image exists before partial deployments start.
