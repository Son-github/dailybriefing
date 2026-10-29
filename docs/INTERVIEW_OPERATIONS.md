# 면접 때만 LIVE로 운영하기

이 절차는 기존 Main State에서 보존 자원은 유지하고 비용이 큰 실행 자원을 제거·복구합니다. **전체 terraform destroy / -target / State 삭제를 사용하지 않습니다. 실제 AWS 변경·배포는 사용자가 직접 실행합니다.** 코드 추가만으로 현재 서버를 내리지 않습니다.

## 보존과 제거 범위

| 유지 | 중단 시 제거, 재개 시 재생성 |
| --- | --- |
| CloudFront, S3 화면 및 실행 설정 | NAT Gateway와 EIP, 인터넷 기본 경로 중 NAT 경로 |
| ECR 저장소/이미지, GitHub OIDC/IAM | ALB, Listener, Target Group |
| 화면/API ACM 인증서와 가비아 검증 CNAME | ECS Cluster/Service/Task Definition 및 실행 역할 |
| VPC, Subnet, Route Table, Security Group | RDS 인스턴스/DB Subnet Group, 실행 모듈 로그·알람 |
| 별도 Bootstrap의 State 버킷, 수동 등록 API Secret | 활성화돼 있다면 AIOps Lambda/SNS/DynamoDB/EventBridge/Scheduler 그룹·대기 예약·관련 IAM/로그/알람 |

DB는 삭제 시 최종 스냅샷을 남기고, 재개 시 그 스냅샷으로 복원합니다. **스냅샷·ECR·S3·보관 중인 Secret 등 비용은 남습니다. 비용 0원을 보장하지 않습니다.** CloudWatch 로그와 AIOps 중복 방지 이력 등 실행 모듈 내부 데이터는 제거될 수 있으므로 면접 증빙이 필요하면 먼저 별도 보관합니다. 삭제하는 DB에는 쓰기를 계속하지 않는 것이 좋습니다.

`www.dailybriefing-son.site`는 기존 CloudFront에 계속 연결되므로 가비아 www 레코드와 카카오 SDK 허용 도메인은 유지합니다. 새 ALB의 DNS 주소는 바뀌므로 **가비아 api CNAME 값은 재개할 때 갱신합니다.** Route 53은 사용하지 않습니다.

## 원칙과 로컬 설정

- 기본 `interview_mode=running`은 현재 운영을 유지합니다. `enable_backend=true`, `database_disposal="protect"`, `allow_storage_cleanup=false`를 기본 terraform.tfvars에서 유지합니다. 비용 절감을 위해 enable_backend만 false로 바꾸지 않습니다.
- `scripts/interview.py`는 Git 제외된 `infra/interview.auto.tfvars.json`만 생성합니다. 기존 terraform.tfvars/State를 수정하지 않고 AWS CLI·plan·apply·destroy도 실행하지 않습니다. JSON overlay는 Terraform이 자동으로 읽어 같은 이름의 기본 값을 덮어씁니다.
- 상태 파일이 아니라 **로컬 요청 설정**입니다. 명령 성공이 AWS 적용 성공을 의미하지 않습니다. 다른 `.auto.tfvars`나 CLI `-var`로 같은 설정을 중복 덮어쓰지 마세요.
- 현재 상태 확인: `python3 scripts/interview.py status`. overlay를 지우면 기본 running이 되어 다음 apply가 자원을 다시 만들 수 있습니다. 중단 상태에서 파일을 잃거나 지우지 말고 안전한 개인 저장소에 보관합니다. Git에는 커밋하지 않습니다.
- 모든 예시는 프로젝트 최상위 디렉터리에서 실행합니다. 저장 계획은 **infra/base.tfplan 하나**를 매번 새로 생성합니다. 설정 변경 전에 저장한 계획을 재사용하지 않습니다.

## 끄기 1 — 샘플 전환과 삭제 정책 준비

1. Actions → runtime-config → main / STATIC_DEMO를 실행하여 공개 화면을 샘플 모드로 바꿉니다. 로그인·개인 서버 저장 기능이 샘플에서는 제공되지 않는 것을 확인합니다. `AWS_DEPLOY_ENABLED=true`와 backend Environment 설정이 필요합니다.
2. Repository Variable `AWS_BACKEND_DEPLOY_ENABLED=false`로 두고, 실행/대기 중인 Backend 배포가 없는지 확인합니다. 자동 LIVE 재전환을 막기 위한 것입니다. AIOps가 활성화돼 있으면 아래 prepare-suspend 단계가 자동으로 processing을 끕니다. ai_enabled/model/Secret ARN 등 기본 설정은 보존합니다. 아직 적용하지 않은 AIOps 코드/설정 변경이 있으면 먼저 별도로 검토·배포하세요. 준비 검사에 그 변경을 섞지 않습니다.
3. 최근 성공한 backend-deploy Summary의 image digest를 기본 terraform.tfvars에 기록합니다. 코드 버전과 DB migration이 맞는 이미지를 재개에 사용해야 합니다. 그 이미지는 ECR에서 보존합니다. 현재 ECR은 최근 10개 보존 정책이므로 중단 중 반복 이미지 업로드로 필요한 digest가 만료되지 않게 하세요. 필요하면 전체 AWS_DEPLOY_ENABLED=false로 신규 앱 업로드를 중단합니다. runtime-config 변경 시에만 다시 켭니다.

```bash
python3 scripts/interview.py prepare-suspend
terraform -chdir=infra validate
terraform -chdir=infra plan -out=base.tfplan
python3 scripts/interview.py check --phase prepare-suspend
```

출력된 고유 final_snapshot_identifier를 기록합니다. 같은 준비 명령을 다시 실행하면 이름을 유지합니다. 직접 지정하려면 첫 명령에 `--snapshot interview-20261026-example`처럼 **아직 사용하지 않은 이름**을 지정합니다.

검사는 기존 RDS의 삭제 보호 해제·최종 스냅샷 정책 저장과 AIOps 수집 중지만 허용합니다. AIOps 수집 중지는 Lambda의 PROCESSING_ENABLED=false, ERROR 구독 제거, ECS 이벤트 규칙 비활성화입니다. 코드·모델·키·IAM 변경을 함께 넣으면 검사가 거절합니다. 다른 미적용 변경이 있으면 중단하므로, 그 변경을 먼저 별도 검토·적용한 뒤 다시 준비합니다. 전체 plan을 확인한 후 **사용자만** 실행:

```bash
terraform -chdir=infra apply base.tfplan
```

이 단계에서는 DB와 ECS가 계속 실행되고 비용도 계속 발생합니다. **스냅샷은 아직 생성되지 않습니다.** 삭제 시 사용할 정책을 RDS/Terraform State에 먼저 저장한 것입니다. prepare 단계 적용이 끝나기 전에 다음 단계로 넘어가지 마세요. 이미 실행 중이던 Lambda는 즉시 취소되지 않으므로 최대 실행 시간인 60초 이상 여유를 두고 진행합니다. 대기 중인 요약 예약 호출도 처리 중지 설정을 읽고 발송/AI 분석을 생략합니다. 기존 요약을 받고 싶다면 준비 전에 집계가 끝날 때까지 기다려 확인하세요. 계획을 적용하면 추가 승인 질문 없이 실제 작업이 시작됩니다.

## 끄기 2 — 실행 자원 제거와 최종 스냅샷 생성

```bash
python3 scripts/interview.py suspend
terraform -chdir=infra plan -out=base.tfplan
python3 scripts/interview.py check --phase suspend
```

검사는 기존 DB State에 `deletion_protection=false`, `skip_final_snapshot=false`, 동일한 final_snapshot_identifier가 저장되어 있는지 확인합니다. 준비 없이 즉시 삭제하려는 계획이나 CloudFront/S3/ECR/ACM/VPC/IAM의 삭제·교체는 거절합니다. CloudFront의 API origin/behavior 제거는 허용하지만 화면 도메인·인증서·기본 behavior는 유지해야 합니다. 인프라 전체 destroy 계획을 검사에 넘기지 않습니다.

검사와 전체 plan 검토 후 **사용자만** 실행:

```bash
terraform -chdir=infra apply base.tfplan
```

완료 후 RDS Console → Snapshots에서 방금 지정한 **수동 최종 스냅샷이 available**인지 확인합니다. 해당 Snapshot ID/계정/리전을 안전한 개인 기록에 남깁니다. NAT/EIP/ALB/ECS/RDS가 실제로 제거됐는지도 Console과 Billing에서 확인합니다. 이 검사 스크립트는 AWS 실제 상태나 비용을 조회하지 않습니다. 자동 백업은 삭제되므로 보존한 최종 스냅샷에 의존합니다. 활성 AIOps 모듈도 제거되며, Scheduler 그룹 삭제가 완료되면 그룹의 대기 예약도 제거됩니다. 그룹 삭제 진행 중에는 예약이 실행될 수 있으므로 준비 단계에서 처리를 먼저 끄는 순서를 유지합니다.

최종 스냅샷이 아직 준비되지 않았거나 apply가 부분 실패했다면 전체 destroy/State rm으로 정리하지 마세요. 같은 로컬 모드와 스냅샷 이름을 유지하고 실제 남은 자원과 오류부터 확인합니다. 계획 검사가 DB 작업 없음/예상 밖 작업으로 멈추면 우회하지 말고 부분 성공 여부를 확인합니다.

## 켜기 — 스냅샷 복원, DNS 갱신, LIVE 전환

면접 **전날** 진행하고 실제 동작을 확인합니다. 복원 시간은 데이터·리전 상태에 따라 달라지며 몇 분 내 완료를 보장하지 않습니다.

```bash
python3 scripts/interview.py resume
# 다른 보관 스냅샷을 복원해야 할 때만 --snapshot 실제-스냅샷-이름 사용
terraform -chdir=infra validate
terraform -chdir=infra plan -out=base.tfplan
python3 scripts/interview.py check --phase resume
```

resume은 이전 최종 스냅샷을 restore_snapshot_identifier에 지정하고 running으로 전환합니다. `aws_db_snapshot` 데이터 조회로 계획 단계에서 원본이 존재하고 available/PostgreSQL인지 확인합니다. 기존 DB가 남아 있는데 복원하려 해 교체 계획이 생기거나, 빈 DB를 생성하려는 계획은 로컬 검사에서 차단합니다. DB 보호는 기본 protect로 복구됩니다.

검사 및 예상 요금/전체 plan 확인 후 **사용자만** 실행:

```bash
terraform -chdir=infra apply base.tfplan
terraform -chdir=infra output -raw alb_dns_name
```

1. 가비아 DNS의 기존 **api CNAME 값만** 새 ALB 주소로 변경합니다. www와 인증서 검증 CNAME은 유지합니다. CloudFront의 API origin 이름은 api.dailybriefing-son.site 그대로라서 별도 주소 변경이 필요하지 않습니다.
2. 새 RDS 주소와 관리 Secret ARN은 Terraform이 ECS에 연결합니다. 클러스터·서비스·Task family·ECR·frontend 식별자 이름은 유지하지만 실제 출력과 GitHub backend Environment 값을 비교합니다. 특히 수동 복구/이름 변경이 있었다면 추측하지 말고 출력값을 사용합니다.
3. API DNS가 전파된 뒤 AWS_DEPLOY_ENABLED=true, AWS_BACKEND_DEPLOY_ENABLED=true로 두고 backend-deploy를 실행합니다. API smoke 성공 후 LIVE로 전환됩니다. 서버 재배포 없이 모드만 전환하려면 runtime-config의 LIVE를 사용할 수 있습니다.
4. AIOps가 활성 설정이면 Lambda·SNS·DynamoDB·Scheduler 그룹도 다시 생성됩니다. SNS 확인 메일의 Confirm subscription을 다시 누르고, processing_enabled=true 및 ai_enabled=true를 기본 설정에 두었다면 재개 직후부터 새 오류를 처리/분석할 수 있음을 확인하세요. 부팅 중에는 수집을 원치 않으면 재개 전에 기본 aiops_settings.processing_enabled=false로 두고 앱 정상화/구독 확인 후 true로 변경해 새 계획을 검토·적용합니다.
5. 회원 로그인/로그아웃·설정·일정·즐겨찾기가 스냅샷 시점대로 유지되는지, 지도·외부 데이터·모바일이 정상인지 확인합니다. 실패하면 샘플 화면을 유지하고 실제 원인을 조사합니다.

복원 원본 스냅샷을 사용 중인 동안은 임의 삭제하지 마세요. Terraform의 restore_snapshot_identifier도 계속 유지해야 합니다. null로 지우면 RDS 교체 계획을 만들 수 있습니다. 다음 중단 시 새 이름의 최종 스냅샷을 만들고, 오래된 스냅샷 삭제는 복구 가능성과 현재 참조를 확인한 뒤 사용자가 별도 처리합니다. 자동 스냅샷 삭제는 구현하지 않습니다.

## 검증 범위와 제한

로컬 검사기는 저장 계획 JSON을 메모리에서 읽고 비밀 원문을 출력/파일 저장하지 않습니다. `terraform show -json`만 호출하며 AWS 자격증명/메타데이터 접근을 차단합니다. 새로운 plan/apply/destroy는 호출하지 않습니다. 계획 검사는 복구 성공이나 비용 상한을 보증하지 않으며, 실제 AWS 중단·스냅샷·복원·DNS 재연결 테스트는 사용자가 직접 실행한 후 확인해야 합니다.

`python3 scripts/test-interview.py`는 외부 호출 없이 단계 전환, 준비 없는 삭제 차단, 보존 자원 삭제 차단, 스냅샷 없는 복원/DB 교체 차단을 검사합니다. Terraform 실제 계획/적용을 테스트에서 실행하지 않습니다.

운영 순서에서 빠져나와 준비만 취소하려면 아직 실행 자원이 제거되지 않았는지 먼저 확인하고 overlay의 interview_mode를 running으로 바꾸어 기존 DB 삭제 보호 복구 계획을 검토합니다. **기존 DB가 남아 있는 상태에서 resume으로 snapshot_identifier를 바꾸지 마세요.**

공식 근거: [RDS 삭제와 최종 스냅샷](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html), [스냅샷 복원](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html).

## AIOps 면접 운영 모드

| 모드 | 앱 실행 자원 | AIOps 처리 | 대기 중인 요약 |
| --- | --- | --- | --- |
| running | 실행 | 기본 processing_enabled/ai_enabled 설정 사용 | 폭주 시 만든 일회성 예약만 실행 |
| prepare-suspend | 실행 유지 | 자동 중지: ERROR 구독 제거, ECS 규칙 비활성, Lambda 처리 차단 | 호출돼도 발송/AI 생략. 이미 실행 중인 호출은 완료될 수 있음 |
| suspended | 최종 스냅샷 후 제거 | 모듈 제거 | 전용 그룹과 함께 제거 |
| 재개 후 running | 스냅샷 복원 | enable_aiops=true일 때 재생성, 기본 설정 복구 | 이전 대기 예약과 임시 집계는 복원하지 않음 |

DynamoDB의 집계·수신 확인·분석 알림 캐시·UTC 일일 한도 기록은 RDS 스냅샷에 포함되지 않습니다. 모듈을 제거하면 사라지고 재생성 시 일일 카운터도 새로 시작합니다. 같은 날 재생성해도 이전 OpenAI 사용량/청구가 초기화되는 것은 아닙니다. 실험 증거가 필요하면 민감정보를 제거한 기록을 먼저 보관하세요.

수동 등록한 API 키용 SSM/Secret, ECR 이미지, 프런트엔드 S3/CloudFront, ACM, VPC, Terraform State는 유지합니다. 따라서 도메인/키를 매번 다시 만들 필요는 없지만 보관 비용이 완전히 없어지는 방식은 아닙니다. api CNAME 갱신과 SNS 구독 재승인은 재개 절차에 포함됩니다.

로컬 준비 검사 21개와 Terraform 구성 검증을 통과했습니다. 실제 계정의 AIOps 중단·예약 제거·재생성·구독 재승인은 사용자가 적용 후 확인해야 합니다.

예약 그룹 삭제 동작: [AWS DeleteScheduleGroup](https://docs.aws.amazon.com/scheduler/latest/APIReference/API_DeleteScheduleGroup.html).
