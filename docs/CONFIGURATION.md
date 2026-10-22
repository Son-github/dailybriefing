# Configuration

외부 API 발급/환경변수/승인/SDK domain/Local 확인은 [API_SETUP.md](API_SETUP.md)가 최신 기준입니다. 응답/단위/한도는 [EXTERNAL_APIS.md](EXTERNAL_APIS.md)를 참고하세요.

`.env`는 repository에 포함하지 않습니다. `.env.example`에 실제 키를 넣지 마세요. Backend는 환경변수 주입을 사용하며 local/test/prod profile로 DB/logging/CORS/cookie를 조정합니다. Production은 COOKIE_SECURE=true와 HTTPS origin이 필요합니다.

Frontend VITE_API_BASE 기본값은 /api/v1. 동일 build를 S3/CloudFront에서 제공할 수 있습니다. 지도 공개 JavaScript 키는 build 값이므로 frontend rebuild가 필요합니다. 서버 REST/API secret은 VITE 변수에 넣지 않습니다.

Compose는 backend→postgres DNS를 사용하고 host에 DB/backend port를 노출하지 않습니다. 개별 개발은 compose.dev.yaml을 사용하세요. `.env` 수정은 실행 중 process에 자동 반영되지 않습니다.
