package com.dailybriefing.transit;

import static com.dailybriefing.transit.MobilityModels.*;

import com.dailybriefing.provider.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KakaoMapRouteClient {

  private final ProviderHttp http;
  private final String url, key;

  public KakaoMapRouteClient(
    ProviderHttp http,
    @Value("${app.kakao-route-url}") String url,
    @Value("${app.kakao-key}") String key
  ) {
    this.http = http;
    this.url = url;
    this.key = key;
  }

  public Routes get(Place start, Place end) {
    if (http.demo()) return new Routes(
      List.of(
        new Route(
          42,
          18000,
          1,
          1500,
          "샘플 지하철 → 샘플 버스",
          List.of(
            new Step(
              StepType.WALK,
              "출발지에서 정류장까지 도보",
              5,
              350,
              "도보",
              "WALK",
              start.name(),
              "샘플 정류장",
              List.of(),
              List.of()
            ),
            new Step(
              StepType.SUBWAY,
              "샘플 지하철 이용",
              25,
              15000,
              "샘플 지하철",
              "SUBWAY",
              "샘플 정류장",
              "환승 지점",
              List.of("샘플 역"),
              List.of()
            ),
            new Step(
              StepType.BUS,
              "샘플 버스 이용",
              12,
              2650,
              "샘플 버스",
              "BUS",
              "환승 지점",
              end.name(),
              List.of(),
              List.of()
            )
          )
        )
      ),
      http.meta("샘플 이동 경로"),
      "UI 체험용 예시예요. 실제 이동에 사용하지 마세요."
    );
    ProviderHttp.requireKey(key);
    // 카카오맵은 장소 좌표만 받습니다. 날짜/시각과 공휴일 조회는 이 API에 필요하지 않습니다.
    var uri = UriComponentsBuilder.fromUriString(url)
      .queryParam("start_x", start.longitude())
      .queryParam("start_y", start.latitude())
      .queryParam("end_x", end.longitude())
      .queryParam("end_y", end.latitude())
      .queryParam("input_coord", "WGS84")
      .queryParam("output_coord", "WGS84")
      .build()
      .encode()
      .toUri();
    var raw = http.get(
      "KakaoMapTransit",
      uri,
      Map.of("Authorization", "KakaoAK " + key)
    );
    return new Routes(
      KakaoMapRouteMapper.map(
        ProviderHttp.decode(raw, KakaoMapRouteResponse.class),
        start,
        end
      ),
      http.meta("카카오맵 대중교통"),
      "조회된 후보 중 최단 소요시간 경로 1개예요. 실제 운행·대기 상황과 요금은 달라질 수 있어요."
    );
  }
}
