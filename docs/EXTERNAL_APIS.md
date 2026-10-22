# 외부 API 계약

Provider 원본은 backend DTO → mapper → 내부 모델로 변환한다. Controller는 원본 JSON을 반환하지 않는다. 서버 응답 cache/Caffeine/Redis는 없다. 독립 Query를 유지하고 connect=2초/read=4초, browser 총15초로 무한 대기를 방지한다.

| Provider / 목적       | 인증 / 환경변수                                       | 요청                                                                      | Raw 주요 필드                                                                                                            | 내부 / Dashboard                                                                                         | 단위·시간                                            | 오류 / 제한                                                                                   |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Kakao Local / 장소    | KakaoAK / KAKAO_REST_API_KEY                          | keyword query,size15 / coord2address x,y                                  | id,place_name,category_name,road/address_name,x,y                                                                        | Place(id?,name,address,category,latitude,longitude,source)                                               | WGS84, x=경도/y=위도                                 | HTTP401/403→승인 안내,429→한도 안내. quota는 앱 설정 확인                                     |
| 카카오맵 / 대중교통 | KakaoAK / KAKAO_REST_API_KEY | start_x,start_y,end_x,end_y,input_coord/output_coord=WGS84 | status,routes[].properties(totalTime,totalDistance,transfers,fare),steps[].properties/path.points | Route(durationMinutes,distanceMeters,transferCount,fareWon?,summary,steps) | 초→올림 분, m, 원, 경로점[x,y]→경도/위도 | 카카오맵 활성화와 앱 쿼터 확인. 경로 없음은 빈 목록, 잘못된 raw502 |
| KMA / 예보            | serviceKey / KMA_API_KEY                              | base_date/time,nx/ny,dataType,numOfRows                                   | category,fcstValue,fcstDate/time,nx/ny                                                                                   | Weather temperature,high/low?,condition,humidity,precipitation,meta                                      | °C,%,서울시각. 기준 시각은 provider 발표 시각        | 활용신청 필요. 코드/키/쿼터 오류 안내. 해외 좌표400                                           |
| KASI / 휴일           | serviceKey / KASI_API_KEY                             | solYear,solMonth,_type,numOfRows                                          | locdate,dateName,isHoliday                                                                                               | Holiday(date,name,holiday,type)                                                                          | yyyyMMdd→LocalDate                                   | item singleton/array 대응. 휴일 실패는 개인 일정과 분리. 신청 한도 확인                       |
| KoreaExim / 환율      | authkey / KOREA_EXIM_API_KEY                          | searchdate,data=AP01                                                      | result,cur_unit,cur_nm,deal_bas_r                                                                                        | Rate(currency,currencyName,value:BigDecimal,displayUnit,change?,changePercent?),meta                     | KRW/외화 기준 단위. JPY100단위 보존. 공표일 서울시각 | empty=무공표 안내. 잘못된 금액502. 신청 페이지 최신 한도 확인                                 |
| NAVER / 뉴스          | X-NCP-APIGW-API-KEY-ID/KEY / NAVER_API_CLIENT_ID/SECRET | category별 query,초기 display5/start1,더보기 display10/nextStart,sortdate | title,description,originallink,link,pubDate                                                                              | Article(title,summary,originalUrl,providerUrl,url,source,publishedAt)                                    | HTML→plain text,RFC1123→Instant ISO8601              | 초기 최대25, 선택분야5 표시; 공급자 display100/start1000. 앱 호출한도/약관 준수, AI 사용 금지 |

## 데이터 정합성

- Provider DTO는 해당 Provider 규격만 알고 mapper는 내부 필드/단위/시간으로 정제한다.
- 카카오맵의 `routes[].properties.totalTime` 원본 초로 최단 소요시간 후보 한 개를 선택한다. 동률이면 환승 수, 거리 순이다. 응답에 없는 출발/도착 시각은 계산해 만들지 않는다.
- `fare.value`가 없으면 확정 요금은 null이다. min/max를 확정 요금으로 대체하지 않는다.
- 잘못된 성공 응답을 샘플 데이터로 바꾸지 않는다. DEMO만 명시적 샘플을 반환한다.
- 최고/최저, 체감온도, 요금, 전일 변동처럼 공급자가 제공하지 않은 값은 null/미제공이다.
- 사진이 없는 NAVER 뉴스는 원문 텍스트 중심으로 표시하며 이미지 크롤링을 추가하지 않는다.
- GPS는 일시적 Place로 처리하며 사용자 저장 동의가 있는 즐겨찾기만 DB에 좌표를 기록한다. URL/로그에는 route request body를 기록하지 않는다.
- 기존 역 기반 favorite은 좌표를 추정하지 않고 needsLocation=true로 전환한다. 사용자가 이름을 유지한 채 출발/도착 장소를 다시 선택해 저장한다.

## 출처 및 검증 범위

[Kakao Local](https://developers.kakao.com/docs/ko/local/dev-guide), [카카오맵 대중교통](https://developers.kakao.com/docs/ko/kakaomap/rest-api), [카카오맵 이용 조건](https://developers.kakao.com/docs/ko/kakaomap/common), [지도 SDK](https://apis.map.kakao.com/web/guide/), [KMA](https://www.data.go.kr/data/15084084/openapi.do), [KASI](https://www.data.go.kr/data/15012690/openapi.do), [KoreaExim](https://www.koreaexim.go.kr/ir/HPHKIR020M01), [NAVER](https://api.ncloud-docs.com/docs/naver-api-hub-search-news).

JSON fixtures는 규격 기반의 synthetic 사례이며 실 사용자/키를 포함하지 않는다. fixture 테스트의 통과는 실제 공급자의 인증·계약·공표 데이터 검증을 의미하지 않는다. LIVE 배포 전 승인 키로 각 provider smoke를 수행해야 한다.

뉴스 응답은 `NewsSections` / `NewsPage(category,items,hasMore,nextStart,meta)`입니다. sections의 부분 실패는 category.error만 반환하고 성공 목록을 유지합니다. 카테고리간 결합·중복제거·재정렬은 하지 않습니다. HUB 설정/표시 및 이용 조건: [API_SETUP](API_SETUP.md).
