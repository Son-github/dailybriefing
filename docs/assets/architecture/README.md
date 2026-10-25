# 아키텍처 그림 소스

| 파일 | 범위 |
| --- | --- |
| cloud-architecture.svg / .png | 현재 서비스의 AWS 네트워크와 보안 경계 |
| delivery-architecture.svg / .png | 앱 CI/CD와 사용자 수동 Terraform 적용 |
| aiops-architecture.svg / .png | 아직 미활성인 선택적 AIOps 모듈 |

GitHub README에는 PNG를 사용하고, 확대·편집용으로 self-contained SVG도 제공합니다. SVG 안의 아이콘은 로컬 symbol로 포함되어 외부 이미지 주소가 필요하지 않습니다. 레이아웃 원본은 `scripts/render-architecture.py`입니다.

```bash
python3 scripts/render-architecture.py
```

PNG는 SVG를 120dpi로 렌더링한 결과입니다. 재생성 시 SVG/PNG를 함께 업데이트하세요. CI가 AWS 리소스나 브라우저 상태에서 자동 수집하는 그림은 아닙니다. 구성 변경 후 Terraform과 문서를 대조해야 합니다.

공식 아이콘 출처: [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/), 2026-07-31 패키지. 아이콘의 권리는 Amazon Web Services에 있으며, 해당 페이지가 허용하는 아키텍처 설명 용도로 사용했습니다. `icons/`에는 사용한 공식 SVG 18개만 포함했습니다. 레이아웃과 화살표는 이 프로젝트에서 작성했습니다.

첨부 참고 그림의 영역 구분 방식을 참고했으며, 실제 구현하지 않은 DEV/PROD/DR 리전 분리·EKS·WAF·이중화 DB를 추가하지 않았습니다. AWS 요청 흐름에서 실선은 요청/통신, 점선은 DNS·브라우저 SDK·로그 등 보조 흐름을 나타냅니다. AIOps 그림의 외곽 점선은 미활성 상태를 나타냅니다.
