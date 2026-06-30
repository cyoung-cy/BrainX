# BrainX AWS Dev Deployment

이 디렉토리는 BrainX 개발환경을 AWS에 배포하기 위한 독립 인프라/CI 설정이다. 기존 애플리케이션 소스는 수정하지 않고, GitHub Actions + ECR + EC2 SSM + Docker Compose로 배포한다.

## Architecture

- Region: `ap-northeast-2`
- Compute: single EC2 `r7i.xlarge` with Docker, 32 GiB RAM, 8 GiB swap
- Database: one RDS PostgreSQL instance, service-specific logical databases
- Object storage: private S3 bucket for future user assets, note images, and attachments
- Container runtime on EC2:
  - `gateway-service`, `user-service`, `workspace-service`, `ingestion-service`, `commerce-service`, `admin-service`, `intelligence-service`
  - `frontend`, `admin-frontend`
  - `redis`, `neo4j`, `qdrant`, `kafka`, `caddy`
- Public entry:
  - user frontend: `https://<public-domain>/`
  - admin frontend: `https://<admin-domain>/`
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

### Cost Control

개발환경을 쓰지 않을 때는 Terraform 변수로 EC2와 RDS runtime을 멈출 수 있다.

```powershell
cd C:\Edu\final-project\BrainX\infra\aws-dev\terraform

# Stop compute/database runtime.
terraform apply -var="ec2_runtime_state=stopped" -var="rds_runtime_state=stopped"

# Start again.
terraform apply -var="ec2_runtime_state=running" -var="rds_runtime_state=running"
```

`ec2_runtime_state`는 Terraform AWS provider의 `aws_ec2_instance_state` 리소스로 관리한다. `stopped` 상태에서는 EC2 instance-hour 비용은 멈추지만 root EBS volume, Elastic IP/public IPv4, ECR, S3 비용은 남는다.

`rds_runtime_state`는 AWS provider가 RDS stopped/running 상태를 직접 모델링하지 않기 때문에 Terraform `local-exec` helper가 AWS CLI로 `start-db-instance`/`stop-db-instance`를 호출한다. 따라서 apply 환경에는 `python`과 `aws` CLI가 필요하다. RDS를 멈춰도 storage, backup, Secrets Manager 비용은 남고, AWS는 장기간 정지된 DB instance를 자동으로 다시 시작할 수 있다. 같은 desired state에서 helper를 다시 실행해야 하면 `rds_runtime_state_operation_nonce` 값을 바꿔서 apply한다.

```powershell
terraform apply -var="rds_runtime_state=stopped" -var="rds_runtime_state_operation_nonce=1"
```

## GitHub Repository Variables

The deploy workflow uses GitHub OIDC and does not require AWS access key secrets. After `terraform apply`, set these repository variables. For domain deployment, set `public_domain_name` and `admin_domain_name` before reading Terraform outputs.

```powershell
gh variable set AWS_REGION --body "$(terraform output -raw aws_region)"
gh variable set AWS_ROLE_TO_ASSUME --body "$(terraform output -raw github_actions_role_arn)"
gh variable set AWS_DEV_INSTANCE_ID --body "$(terraform output -raw ec2_instance_id)"
gh variable set AWS_DEV_ARTIFACT_BUCKET --body "$(terraform output -raw artifact_bucket_name)"
gh variable set AWS_DEV_ASSET_BUCKET --body "$(terraform output -raw asset_bucket_name)"
gh variable set AWS_DEV_ASSET_BUCKET_REGION --body "$(terraform output -raw asset_bucket_region)"
gh variable set AWS_ECR_REGISTRY --body "$(terraform output -raw ecr_registry)"
gh variable set AWS_DEV_RDS_SECRET_ARN --body "$(terraform output -raw rds_secret_arn)"
gh variable set AWS_DEV_RDS_HOST --body "$(terraform output -raw rds_address)"
gh variable set AWS_DEV_RDS_PORT --body "$(terraform output -raw rds_port)"
gh variable set AWS_DEV_SSM_PARAMETER_PREFIX --body "$(terraform output -raw ssm_parameter_prefix)"
gh variable set AWS_DEV_PUBLIC_BASE_URL --body "$(terraform output -raw main_public_base_url)"
gh variable set AWS_DEV_ADMIN_PUBLIC_BASE_URL --body "$(terraform output -raw admin_public_base_url)"
gh variable set AWS_DEV_PUBLIC_SITE_ADDRESS --body "$(terraform output -raw public_site_address)"
gh variable set AWS_DEV_ADMIN_SITE_ADDRESS --body "$(terraform output -raw admin_site_address)"
gh variable set AWS_DEV_ACME_EMAIL --body "$(terraform output -raw acme_email)"
```

## External DNS And HTTPS

이 개발환경은 Route 53, ALB, ACM을 만들지 않는다. 외부 DNS provider에서 직접 A record를 만든 뒤 Caddy가 EC2에서 HTTPS 인증서를 자동 발급한다.

Required DNS records:

```text
<public-domain>       A  43.201.161.67
admin.<public-domain> A  43.201.161.67
```

Terraform 변수는 도메인 값으로 설정한다.

```hcl
public_domain_name = "example.com"
admin_domain_name  = "admin.example.com"
acme_email         = "admin@example.com"
```

도메인 적용 후 GitHub variables를 갱신하고, frontend image에는 public base URL이 build-time에 들어가므로 `workflow_dispatch`에서 `deploy_all=true`로 한 번 재배포한다.

OAuth provider redirect URI도 public domain 기준으로 맞춘다.

```text
https://<public-domain>/oauth/google/callback
https://<public-domain>/oauth/kakao/callback
https://<public-domain>/oauth/naver/callback
```

## User Asset S3 Bucket

`aws_s3_bucket.assets`는 사용자 업로드 파일, 노트 이미지, 첨부파일을 위한 private object storage다. 현재 Ingestion-Service는 아직 로컬 디스크 기반 `AssetStorageService`를 사용하므로, 이 버킷은 S3 adapter/presigned URL 구현을 위한 인프라 준비 단계다.

Default bucket name:

```text
brainx-dev-assets-<aws-account-id>-<region>
```

Security/cost defaults:

- Public access block enabled
- Bucket owner enforced object ownership
- AES256 server-side encryption
- Incomplete multipart uploads aborted after 7 days
- EC2 instance profile has read/write/delete access to this bucket only
- `asset_bucket_force_destroy=false` by default to avoid accidental asset loss

If direct browser upload is implemented later, CORS defaults to the configured public/admin domains. Override with `asset_bucket_cors_allowed_origins` when needed.

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
aws ssm put-parameter --name /brainx/dev/NOTION_CLIENT_ID --type SecureString --value "<notion client id>"
aws ssm put-parameter --name /brainx/dev/NOTION_CLIENT_SECRET --type SecureString --value "<rotated notion client secret>"
aws ssm put-parameter --name /brainx/dev/NOTION_REDIRECT_URI --type SecureString --value "https://brainx.p-e.kr/notion-callback"
aws ssm put-parameter --name /brainx/dev/CDN_BASE_URL --type SecureString --value "https://brainx.p-e.kr"
aws ssm put-parameter --name /brainx/dev/ASSET_STORAGE_DIR --type SecureString --value "/app/asset-storage"
```

For Notion import in the domain-based dev environment, register this exact redirect URI in the Notion integration settings:

```text
https://brainx.p-e.kr/notion-callback
```

`NOTION_CLIENT_SECRET` must be rotated before it is stored if it was ever pasted into chat, issue trackers, or logs. The current Ingestion-Service still uses local disk `AssetStorageService`, so `ASSET_STORAGE_DIR=/app/asset-storage` is backed by the `ingestion_asset_storage` Docker volume. The S3 asset bucket is prepared for a later S3 adapter/presigned URL implementation, but this deployment path does not use it yet.

Optional admin seed overrides:

```powershell
aws ssm put-parameter --name /brainx/dev/SEED_ADMIN_LOGIN_ID --type SecureString --value "admin"
aws ssm put-parameter --name /brainx/dev/SEED_ADMIN_NAME --type SecureString --value "BrainX Admin"
```

The RDS master username/password is generated and stored by AWS Secrets Manager through `manage_master_user_password`; do not copy it into GitHub secrets.

## Runtime Environment Operations

AWS dev runtime values are split by responsibility:

- GitHub repository variables hold deploy infrastructure values used by `.github/workflows/brainx-dev-deploy.yml`, such as region, ECR registry, EC2 instance id, public URLs, and the SSM parameter prefix.
- AWS SSM Parameter Store holds application runtime secrets and service configuration values under `/brainx/dev/*`.
- `infra/aws-dev/scripts/deploy_remote.sh` reads SSM and RDS Secrets Manager, writes `/opt/brainx/env/runtime.env` on EC2, then runs Docker Compose with `--env-file`.
- `infra/aws-dev/deploy/docker-compose.yml` decides which runtime env keys are actually passed into each container.

### Reset An Existing SSM Value

Use `--overwrite` to replace a value. Use `SecureString` unless the value is intentionally public.

```powershell
aws ssm put-parameter `
  --region ap-northeast-2 `
  --name /brainx/dev/OPENAI_API_KEY `
  --type SecureString `
  --value "<new value>" `
  --overwrite
```

Verify that the parameter exists. Avoid printing decrypted secrets into shared terminals, screenshots, or issue comments.

```powershell
aws ssm get-parameter `
  --region ap-northeast-2 `
  --name /brainx/dev/OPENAI_API_KEY
```

An SSM-only change is not applied to running containers until the deploy workflow runs again. Use GitHub Actions `BrainX Dev Deploy` with `workflow_dispatch` and either `deploy_all=true` or `services` set to the affected service, for example:

```text
services: intelligence-service
```

### Add A Backend Runtime Env Variable

For a new backend env var, update every layer that consumes or transports the value.

1. Add the application-side env lookup in the target service, for example `application.yml` or `application.yaml`.

```yaml
brainx:
  feature:
    enabled: ${BRAINX_FEATURE_ENABLED:false}
```

2. Teach `deploy_remote.sh` to read the SSM parameter and write it to `runtime.env`.

```bash
BRAINX_FEATURE_ENABLED="$(get_parameter BRAINX_FEATURE_ENABLED false)"
...
write_env BRAINX_FEATURE_ENABLED "$BRAINX_FEATURE_ENABLED"
```

3. Pass the value into the target container in `infra/aws-dev/deploy/docker-compose.yml`.

```yaml
environment:
  BRAINX_FEATURE_ENABLED: ${BRAINX_FEATURE_ENABLED:-false}
```

4. Register the value in SSM.

```powershell
aws ssm put-parameter `
  --region ap-northeast-2 `
  --name /brainx/dev/BRAINX_FEATURE_ENABLED `
  --type SecureString `
  --value "true" `
  --overwrite
```

5. Document the parameter in this README when it is team-operated. Then run the deploy workflow for the affected service, or merge the code/config change to `main` and let the workflow detect it.

Local checks before merging infra transport changes:

```powershell
docker compose -f infra/aws-dev/deploy/docker-compose.yml config --quiet
bash -n infra/aws-dev/scripts/deploy_remote.sh
git diff --check
```

### Add A Frontend `NEXT_PUBLIC_*` Value

`NEXT_PUBLIC_*` values are public browser bundle values. Do not put secrets in them. In Next.js, these values are normally fixed at image build time, so SSM runtime changes alone are not enough.

To add a new public frontend value:

1. Add `ARG` and `ENV` in `infra/aws-dev/dockerfiles/brainx-next.Dockerfile`.

```dockerfile
ARG NEXT_PUBLIC_FEATURE_FLAG=false
ENV NEXT_PUBLIC_FEATURE_FLAG=$NEXT_PUBLIC_FEATURE_FLAG
```

2. Add a frontend build arg in `.github/workflows/brainx-dev-deploy.yml`.

```bash
--build-arg "NEXT_PUBLIC_FEATURE_FLAG=false"
```

3. Add the key to `infra/aws-dev/deploy/docker-compose.yml` only when the server process also needs to read it at runtime.

4. Rebuild the `frontend` image. A container restart without image rebuild will not change already-built client code.

### Add Or Reset A GitHub Repository Variable

Use GitHub repository variables for deploy infrastructure and non-secret build configuration that the workflow needs before it reaches EC2.

```powershell
gh variable set AWS_DEV_PUBLIC_BASE_URL --body "https://brainx.p-e.kr"
```

Do not store app API keys or passwords in GitHub repository variables for this deployment path. Use SSM Parameter Store instead.

### Team Access For SSM Env Management

Do not share one IAM user or one access key across teammates. If AWS Organizations/IAM Identity Center is not available, create one IAM user per person, enable MFA, and attach a minimum-scope policy such as:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ManageBrainxDevSsmParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:DescribeParameters",
        "ssm:PutParameter"
      ],
      "Resource": "arn:aws:ssm:ap-northeast-2:<AWS_ACCOUNT_ID>:parameter/brainx/dev/*"
    }
  ]
}
```

Keep `ssm:DeleteParameter` out of the normal teammate policy. Delete operations should stay with an administrator.

For CLI setup, each teammate should configure their own profile:

```powershell
aws configure --profile brainx-dev
```

Then use that profile for SSM updates:

```powershell
aws ssm put-parameter `
  --profile brainx-dev `
  --region ap-northeast-2 `
  --name /brainx/dev/OPENAI_API_KEY `
  --type SecureString `
  --value "<new value>" `
  --overwrite
```

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
