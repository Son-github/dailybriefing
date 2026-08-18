# DailyBriefing

환율, 날씨, 시장 지수, 주요 뉴스를 한 화면에 보여주는 개인화 브리핑 서비스입니다.

## 로컬 Docker 실행

필요한 것은 Docker Desktop과 Docker Compose뿐입니다. AWS 계정이나 Terraform은 로컬 실행에 사용하지 않습니다.

1. 로컬 환경 파일을 만듭니다.

   ```bash
   cp .env.example .env
   ```

2. `.env`에 한국수출입은행과 기상청 공공데이터 API 키를 입력합니다. KIS와 Twelve Data 키는 선택 사항입니다. 키가 비어 있어도 컨테이너는 기동하지만 해당 데이터는 표시되지 않습니다.

3. 전체 스택을 빌드하고 실행합니다.

   ```bash
   docker compose up --build
   ```

4. 브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

백그라운드 실행은 다음 명령을 사용합니다.

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f
```

종료할 때 데이터베이스와 Redis 데이터는 보존됩니다.

```bash
docker compose down
```

로컬 데이터를 모두 초기화할 때만 `-v`를 붙입니다.

```bash
docker compose down -v
```

## 로컬 구성

| 구성 요소 | 주소/포트 | 역할 |
| --- | --- | --- |
| Frontend | http://localhost:3000 | React UI와 로컬 API 프록시 |
| API Gateway | http://localhost:8080 | 백엔드 경로 라우팅 |
| Auth service | http://localhost:8081 | 회원가입, 로그인, 사용자 설정 |
| Exchange service | http://localhost:8082 | 환율과 시장 지수 |
| Weather service | http://localhost:8083 | 지역별 날씨 |
| News service | http://localhost:8084 | 주요 뉴스와 트렌드 키워드 |
| PostgreSQL | localhost:5432 | 사용자 및 수집 이력 저장 |
| Redis | localhost:6379 | 외부 API 응답 캐시와 갱신 락 |

프런트엔드는 브라우저에서 같은 출처의 `/auth`, `/exchange`, `/weather`, `/news` 경로를 호출합니다. 프런트 Nginx가 이를 API Gateway로 전달하고, API Gateway가 각 Spring Boot 서비스로 라우팅합니다.

## 환경변수

기본 템플릿은 [.env.example](./.env.example)에 있습니다.

- `EXCHANGE_API_KEY`: 한국수출입은행 환율 API 키
- `WEATHER_API_KEY`: 기상청 공공데이터 API 키
- `KIS_APP_KEY`, `KIS_APP_SECRET`: 코스피·코스닥 조회용, 선택 사항
- `TWELVE_DATA_API_KEY`: 나스닥 조회용, 선택 사항
- `JWT_SECRET`: 로컬 JWT 서명 키, 32바이트 이상

기존 `backend/.env`와 `backend/.env.local`도 호환을 위해 읽으며, 새 설정은 루트 `.env` 사용을 권장합니다.

## 서비스 구조

```text
Browser
  -> frontend (Nginx + React)
      -> api-gateway (Nginx)
          -> auth-service
          -> exchange-service
          -> weather-service
          -> news-service
              -> PostgreSQL / Redis / external APIs
```

AWS 배포 구성은 로컬 Docker와 분리되어 있습니다. 이후 배포할 때는 [DEPLOYMENT.md](./DEPLOYMENT.md)와 `terraform/`을 사용하면 됩니다.
