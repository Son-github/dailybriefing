## DailyBriefing
<p align="center">
<img width="300" height="300" alt="Logo" src="https://github.com/user-attachments/assets/9591ad07-54ca-419b-8444-f1b1c9cf3b3f" />
</p>

## 💻 프로젝트 소개
AWS 클라우드 상에서 운영되는 실시간 대시보드 서비스입니다. 
React + Spring Boot 기반의 MSA 구조를 AWS ECS Fargate 상에 컨테이너로 배포하여 로그인/로그아웃, 환율, 날씨, 뉴스를 통합적으로 제공하는 웹 애플리케이션입니다.

## 📌 핵심목표
 * 맞춤 정보를 오픈API를 활용해 실시간 제공하는 대시보드 구축
 * AWS 클라우드 상의 인프라 운영
 * IaC(Terraform) 기반으로 인프라 자동화 및 재현성 확보
 * 비용효율성, 성능을 모두 고려한 클라우드 설계

## 🏷 기술스택
<p>
<img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB">
<img alt="Spring" src="https://img.shields.io/badge/spring-%236DB33F.svg?style=for-the-badge&logo=spring&logoColor=white">
<img alt="PostgreSQL" src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white">
<img alt="AWS" src="https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white">
<img alt="GithubActions" src="https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white">
<img alt="Terraform" src="https://img.shields.io/badge/terraform-%235835CC.svg?style=for-the-badge&logo=terraform&logoColor=white">
</p>

## 🧩 AWS Architecture
<img width="4084" height="2004" alt="image" src="https://github.com/user-attachments/assets/0f512ab4-ed2b-40a5-a2d6-4590d0dcf0fc" />


## 🔔 특징
 * /auth, /weather, /news, /exchange 등 MSA 단위 트래픽 분리
 * CloudFront + S3 연동으로 정적 리소스 보안 강화
 * API Key, DB PW 등 중요 데이터는 Parameter Store + KMS 암호화 관리
 * 단일 AZ 구성으로 비용 절감

## 📗 CI/CD
 * GitHub Actions -> ECR -> ECS
  * 서비스별 Docker 이미지 빌드
  * 태그 버전 관리 및 최신 이미지 자동 반영

## 📘 인프라 구성
<p align="center">
<img width="100" height="100" alt="image" src="https://github.com/user-attachments/assets/fd3066fd-5b6c-4061-ba55-f568a5090d45" />
</p>
 
 * VPC
   * 1개의 Pulic Subnet과 2개의 Private Subnet으로 구성
   * Public Subnet에는 ALB와 NAT gateway를 배치해 ECS의 컨테이너가 외부와 통신이 가능하도록 설정
   * ECS용 Private Subnet에는 ECS 배치, Security Group을 활용해 RDS와 ALB, NAT gateway만 통신이 가능하도록 설정
   * DB용 Private Subnet에는 RDS(PostgreSQL) 배치, Security Group을 활용해 ECS용 Private Subnet만 통신이 가능하도록 설정

<p align="center">
<img width="100" height="100" alt="image" src="https://github.com/user-attachments/assets/464ce0e1-70ef-46f8-9eeb-13cee67afd1f" />
</p>

 * ECS
   * CI/CD 자동화를 통해 항상 최신버전이 유지되도록 설정
   * Fargate를 기반으로하여 트래픽이 생기면 인스턴스 작동 보통 기간에는 인스턴스 작동 X

<p align="center">
<img width="100" height="100" alt="image" src="https://github.com/user-attachments/assets/e8006041-4840-4bd7-8552-69fd5cdc1a87" />
</p>

 * RDS
   * 단일 AZ에 생성하여 안정성은 줄지만 비용효율성을 높임
   * Aurora 대신 RDS를 활용해 성능보단 비용 절감을 선택

<p align="center">
<img width="100" height="100" alt="image" src="https://github.com/user-attachments/assets/fd52aeb1-24c9-46d4-a539-1073be1b6d9d" />
<img width="100" height="100" alt="image" src="https://github.com/user-attachments/assets/c10ca64e-92f9-4ac6-9cf2-5f6e1c413feb" />
</p>

 * CloudFront + S3
   * 정적자원(Frontend)을 위치하여 비용 절감 및 성능 최적화를 이뤄냄

<p align="center">
<img width="100" height="100" alt="image" src="https://github.com/user-attachments/assets/e6db909e-c50e-451c-b745-ea99a070ab53" />
</p>

 * CloudWatch
   * 장애 감시 및 로그 확인

## 📙 비용 최적화 전략
 * 단일 AZ 사용
 * ECS를 Fargate 기반으로 설정
 * RDS 단일 AZ 운영

## 📕 IaC 구성
 * 모든 인프라를 Terraform으로 코드화
 * VPC, ECS, ALB, CloudFront, RDS 등 이용하는 서비스를 모두 모듈화하여 재사용성 극대화
 * 모듈을 활용해 prod폴더의 main.tf 파일에서 인프라 활성화
 * variable.tf, output.tf를 활용하여 리소스 관리

## 📓 배운 점 및 성과
 * MSA 간 네트워크 분리와 통신 구조 설계 이해
 * IaC(Terraform)을 이용한 인프라 환경 구성 역량
 * ECS + CloudFront 기반 운영 경험
 * 예상 클라우드 비용 분석을 통한 비용 효율적 설계 감각 체득
