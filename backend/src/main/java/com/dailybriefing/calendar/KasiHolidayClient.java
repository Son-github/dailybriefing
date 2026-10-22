package com.dailybriefing.calendar;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.ProviderHttp;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KasiHolidayClient {

  private final ProviderHttp http;
  private final String url, key;

  public KasiHolidayClient(
    ProviderHttp http,
    @Value("${app.holiday-url}") String url,
    @Value("${app.holiday-key}") String key
  ) {
    this.http = http;
    this.url = url;
    this.key = key;
  }

  public record Holiday(
    LocalDate date,
    String name,
    boolean holiday,
    String type
  ) {}

  public List<Holiday> get(int year, int month) {
    if (http.demo()) {
      // DEMO는 고정 양력 공휴일 일부만 보여줍니다. 음력/대체공휴일을 임의 계산하지 않습니다.
      var samples = Map.of(
        "01-01",
        "신정",
        "03-01",
        "삼일절",
        "05-05",
        "어린이날",
        "06-06",
        "현충일",
        "08-15",
        "광복절",
        "10-03",
        "개천절",
        "10-09",
        "한글날",
        "12-25",
        "크리스마스"
      );
      return samples
        .entrySet()
        .stream()
        .map(e ->
          new Holiday(
            LocalDate.parse(year + "-" + e.getKey()),
            e.getValue(),
            true,
            "PUBLIC"
          )
        )
        .filter(h -> h.date().getMonthValue() == month)
        .sorted(Comparator.comparing(Holiday::date))
        .toList();
    }
    if (key.isBlank()) throw new ApiException(
      503,
      "HOLIDAY_NOT_CONFIGURED",
      "공휴일 API 설정이 필요해요. 개인 일정은 계속 사용할 수 있어요."
    );
    // .env에는 공공데이터포털의 Decoding 키를 넣으세요. encoding은 URI builder가 한 번 처리합니다.
    var uri = UriComponentsBuilder.fromUriString(url + "/getRestDeInfo")
      .queryParam("serviceKey", "{serviceKey}")
      .queryParam("solYear", year)
      .queryParam("solMonth", String.format("%02d", month))
      .queryParam("_type", "json")
      .queryParam("numOfRows", 100)
      .encode()
      .buildAndExpand(key)
      .toUri();
    var response = http.get("KASI", uri, Map.of()).path("response");
    if (
      !response.path("header").path("resultCode").asText().equals("00")
    ) throw new ApiException(
      502,
      "HOLIDAY_UPSTREAM",
      "공휴일 정보를 가져오지 못했어요."
    );
    return KasiHolidayMapper.map(
      response.path("body").path("items").path("item")
    );
  }
}
