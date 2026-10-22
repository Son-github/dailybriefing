package com.dailybriefing.weather;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KmaWeatherClient {

  private final ProviderHttp http;
  private final String url, key;
  private final Clock clock;

  public KmaWeatherClient(
    ProviderHttp http,
    @Value("${app.weather-url}") String url,
    @Value("${app.weather-key}") String key,
    Clock clock
  ) {
    this.http = http;
    this.url = url;
    this.key = key;
    this.clock = clock;
  }

  public ProviderModels.Weather get(double lat, double lon) {
    if (http.demo()) return new ProviderModels.Weather(
      21,
      20.0,
      24.0,
      16.0,
      "맑음",
      52,
      10,
      http.meta("샘플 날씨")
    );
    if (lat < 33 || lat > 39 || lon < 124 || lon > 132) throw new ApiException(
      400,
      "WEATHER_REGION",
      "기상청 날씨는 대한민국 지역에서 제공해요."
    );
    ProviderHttp.requireKey(key);
    // 환경변수에는 공공데이터포털 일반 인증키(Decoding) 원본만 받습니다.
    if (
      java.util.regex.Pattern.compile("%[0-9a-fA-F]{2}").matcher(key).find()
    ) throw new ApiException(
      503,
      "KMA_KEY_ENCODING",
      "기상청 인증키는 Decoding 값을 입력해 주세요."
    );
    if (
      "apihub.kma.go.kr".equals(java.net.URI.create(url).getHost())
    ) throw new ApiException(
      503,
      "KMA_ENDPOINT_MISMATCH",
      "현재 설정은 공공데이터포털 serviceKey 방식이에요."
    );
    var now = LocalDateTime.now(clock);
    var base = KmaWeatherMapper.base(now);
    var grid = KmaWeatherMapper.grid(lat, lon);
    var uri = UriComponentsBuilder.fromUriString(url + "/getVilageFcst")
      .queryParam("serviceKey", "{key}")
      .queryParam("dataType", "JSON")
      .queryParam("numOfRows", 1000)
      .queryParam("pageNo", 1)
      .queryParam("base_date", base.format(DateTimeFormatter.BASIC_ISO_DATE))
      .queryParam("base_time", base.format(DateTimeFormatter.ofPattern("HHmm")))
      .queryParam("nx", grid.nx())
      .queryParam("ny", grid.ny())
      .encode()
      .buildAndExpand(key)
      .toUri();
    // Decoding key → URI builder에서 정확히1회 encode → URI overload로 그대로 전송.
    var response = http.get("KMA", uri, Map.of()).path("response");
    if (
      response.path("header").path("resultCode").asText().equals("03")
    ) throw new ApiException(
      503,
      "WEATHER_UNAVAILABLE",
      "선택한 지역과 시각의 예보가 아직 없어요."
    );
    ProviderHttp.checkPublicData(response);
    var raw = response.path("body").path("items").path("item");
    var items = ProviderHttp.decode(raw, KmaForecastItem[].class);
    return KmaWeatherMapper.map(
      Arrays.asList(items),
      now,
      new ProviderModels.Meta(
        "기상청 단기예보",
        "LIVE",
        base.atZone(clock.getZone()).toInstant()
      )
    );
  }
}
