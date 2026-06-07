# DailyBriefing deployment guide

## Environment separation

- Local Docker uses `docker-compose.yml`, `docker-compose.local.yml`, and
  `backend/.env.local`.
- AWS production uses only `terraform/`, ECS task definitions, and Secrets
  Manager. Docker Compose and `.env.local` are not used by AWS.

To run locally, copy the example file, fill in the API keys, and start both
Compose files:

```bash
cp backend/.env.local.example backend/.env.local
docker compose --env-file backend/.env.local \
  -f docker-compose.yml -f docker-compose.local.yml up --build
```

Open `http://localhost:3000`. To stop without deleting the local database:

```bash
docker compose --env-file backend/.env.local \
  -f docker-compose.yml -f docker-compose.local.yml down
```

Add `-v` to the `down` command only when the local PostgreSQL data should also
be deleted.

## Architecture

The low-cost deployment keeps the ALB public, gives each ECS Fargate task a
public IP for outbound data-provider calls, and only permits inbound traffic
from the ALB security group. RDS remains in private DB subnets.

This replaces the previous private-ECS-plus-NAT design. The security groups
still prevent direct inbound access to ECS tasks, while removing the NAT
Gateway hourly charge.

CloudFront serves the React build from S3 and forwards `/auth*`, `/exchange*`,
`/weather*`, and `/news*` to the ALB. API responses are not cached by
CloudFront. The applications cache provider responses for 10 minutes.

## Secrets to create

Create these plaintext Secrets Manager secrets before `terraform plan`:

```text
/dailybriefing/jwt/secret
/dailybriefing/api/exchange
/dailybriefing/api/weather
```

`/dailybriefing/api/exchange` stores the Korea Eximbank API key. RDS creates
and rotates its own master password.

When KIS and Twelve Data providers are selected, add these names to
`application_secret_names` in `terraform/dev/main.tf` and create the matching
Secrets Manager secrets:

```text
/dailybriefing/api/kis-app-key
/dailybriefing/api/kis-app-secret
/dailybriefing/api/twelve-data
```

## Terraform state

Create one private, versioned S3 bucket for Terraform state, then copy
`terraform/dev/backend.hcl.example` to a local `backend.hcl` and fill in the
bucket name.

```bash
cd terraform/dev
terraform init -reconfigure -backend-config=backend.hcl
terraform plan
terraform apply
```

The previous local state is empty. An old empty `dailybriefing-vpc` also
exists in AWS and should be deleted before applying to avoid duplicate VPCs.

## Values you provide

- Korea Eximbank API key
- Weather API key
- KIS app key and secret when selected
- Twelve Data API key when selected
- A JWT secret of at least 32 bytes
- GitHub Actions AWS credentials, S3 bucket name, and CloudFront distribution ID

## Behavior changes

- Market demo constants were replaced with real provider calls.
- Missing KIS or Twelve Data credentials now produce empty index fields rather
  than preventing the service from starting.
- News sentiment analysis and its deployment workflow were removed.
- Weather, news, and market data are reused for 10 minutes.
- The frontend refreshes all dashboard cards every 10 minutes.
- CloudFront now routes API paths to ALB instead of returning the React page
  for API errors.
