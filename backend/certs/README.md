# RDS TLS 인증서

`rds-global-bundle.pem`은 AWS가 공개 배포하는 RDS CA 묶음입니다. 비밀정보가 아닙니다.
출처: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
2026-10-20 다운로드 후 PEM 파싱을 확인했습니다. 실제 RDS 인증/연결은 미검증입니다.

prod는 PostgreSQL sslmode=verify-full로 hostname/인증서를 검증합니다. 정기적인 CA 교체 전에는 AWS 공지를 확인하고 bundle 갱신 → 이미지 재빌드 → 연결 테스트가 필요합니다. 인증서 검증을 끄는 우회는 하지 않습니다. local/test PostgreSQL 설정은 바꾸지 않았습니다.
