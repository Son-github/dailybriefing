# 기상청 2026년 10월 가이드와 구현 대조

검토 대상: 사용자가 제공한 `단기예보조회서비스_API활용가이드_261019.docx`. 가이드의 `단기예보조회 요청/응답 명세`, `코드값 정보`, `예보 발표시각`, `최고/최저기온` 절과 구현을 대조했습니다.

## 인증키 입력 원칙

**현재 프로젝트의 KMA_API_KEY에는 공공데이터포털 일반 인증키(Decoding)를 입력합니다. Encoding 키를 넣지 마세요.**

```dotenv
# 공공데이터포털에서 일반 인증키(Decoding)를 그대로 복사합니다.
KMA_API_KEY=
KMA_API_URL=https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0
```

가이드 요청표의 `인증키 (URL Encode)`는 최종 전송 URL의 키 값이 URL 인코딩되어야 한다는 뜻입니다. 우리 코드는 Decoding 원본을 받아 Spring URI builder로 정확히 한 번 인코딩합니다. 이미 완성한 URI는 HTTP client의 URI overload에 전달해 다시 인코딩하지 않습니다.

설명용 가짜 키:

- env 원본: `fixture+key/value==`
- 전송값: `fixture%2Bkey%2Fvalue%3D%3D`
- 잘못된 이중 인코딩: `%252B`, `%252F`, `%253D`

실제 키는 문서·콘솔·로그에 출력하지 않습니다. 브라우저 주소창에 API URL을 직접 조립하는 방식과, 프로그램의 파라미터 builder를 사용하는 방식은 입력 키 처리 위치가 다릅니다. 이 프로젝트에서는 Decoding만 사용한다는 계약으로 통일합니다.

## 공공데이터포털과 API허브 구분

첨부 문서 자체에 두 체계가 혼재합니다. 서비스/요청 예제 URL은 `apihub.kma.go.kr`이고 파라미터는 `authKey`입니다. 반면 요청 메시지 표는 공공데이터포털의 `serviceKey`와 URL Encode 인증키를 설명합니다.

| 체계           | 호스트           | 인증 파라미터 | 현재 앱                                               |
| -------------- | ---------------- | ------------- | ----------------------------------------------------- |
| 공공데이터포털 | apis.data.go.kr  | serviceKey    | 지원. KMA_API_KEY에 일반 인증키(Decoding)             |
| 기상청 API허브 | apihub.kma.go.kr | authKey       | 현재 미지원. 별도 API허브 발급키·클라이언트 설정 필요 |

API허브 authKey를 공공데이터포털 Decoding 키와 같은 것으로 취급하지 마세요. `KMA_API_URL`만 API허브 URL로 바꾸는 것으로 전환되지 않습니다. 가이드 예제 URL을 그대로 env에 복사하지 않고, 현재 지원하는 위의 공공데이터포털 기본값을 유지하세요.

공식 확인: [공공데이터포털 서비스](https://www.data.go.kr/data/15084084/openapi.do), [기상청 API허브](https://apihub.kma.go.kr/).

## 데이터 조회 구조 대조

| 항목               | 가이드                                    | 구현 판단                                              |
| ------------------ | ----------------------------------------- | ------------------------------------------------------ |
| 단기예보           | getVilageFcst                             | 일치                                                   |
| 형식               | JSON/XML, 기본 XML                        | dataType=JSON 명시                                     |
| 기준 날짜/시간     | yyyyMMdd/HHmm, KST                        | Asia/Seoul Clock                                       |
| 발표               | 02/05/08/11/14/17/20/23                   | 일치                                                   |
| 제공               | 발표10분 이후                             | 02:09→전날23시,02:10→당일02시                          |
| 위치               | nx/ny 격자                                | 위경도→5km Lambert, 서울시청60/127                     |
| 기온/습도/강수확률 | TMP/REH/POP                               | 숫자 정제, °C/%                                        |
| 날씨 상태          | SKY/PTY                                   | 내부 한국어 상태로 변환                                |
| 최고/최저          | TMX/TMN, 발표시각마다 오늘 값 유무 다름   | 오늘 값이 없으면 미제공. 임의 생성하지 않음            |
| 체감온도           | 해당 단기예보 요소에 없음                 | LIVE null/미제공                                       |
| 기온 성격          | TMP=1시간 예보기온, 관측은 초단기실황 T1H | 현재는 예보 Widget. 실시간 관측을 가져오는 구조가 아님 |

현재 구조는 Backend→KmaWeatherClient→raw DTO→Mapper→내부 Weather→Frontend입니다. API key는 Backend에서만 사용합니다. 예보 시각의 데이터를 선택하는 화면이며, 실제 현재 관측기온을 제공하려면 `getUltraSrtNcst`를 별도 연동해야 합니다. 이번 점검에서 임의로 관측 API로 교체하지 않습니다.

## 검증 범위

키 특수문자(+ / =)를 넣은 로컬 HTTP 요청을 캡처하는 테스트로 인코딩 횟수와 base_date/base_time/nx/ny를 확인합니다. grid·기준시간·필드 정제도 fixture로 검증합니다. 실제 승인된 키로 외부 기상청 성공 호출을 한 결과와 fixture 검증은 구분합니다.

## 점검에서 보완한 부분

1. 기존 구현은 builder에서 인코딩한 URL String을 RestClient의 String URI 템플릿에 전달해 `%2B`가 `%252B`로 다시 변환되는 문제가 로컬 네트워크 테스트에서 재현되었습니다. KMA 요청을 완성된 URI 객체로 전송하도록 고쳤습니다. 다른 공급자의 기존 String 경로는 변경하지 않았습니다.
2. Encoding 형태의 키와 API허브 URL 혼용은 외부 호출 전에 명시적 오류로 안내합니다. 실제 `.env` 키 값은 변경하지 않고 주석만 명확히 했습니다.
3. 가이드의 ±900 이상 Missing/해상 마스킹 값을 기온·습도·강수확률로 표시하지 않습니다. 필수값이 없으면 예보 미제공 안내, TMX/TMN의 Missing은 null로 처리합니다. PTY4는 소나기로 표시합니다.
4. 값이 없을 때 SKY를 임의로 맑음으로 채우지 않습니다. NO_DATA(resultCode03)도 예보 미제공으로 처리합니다.

기상청 Meta.updatedAt은 선택한 예보의 발표 기준시각입니다. 화면의 API 조회 로그/HTTP requestId와 구분해서 읽으세요.
