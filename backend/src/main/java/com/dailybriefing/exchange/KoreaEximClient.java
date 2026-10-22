package com.dailybriefing.exchange;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KoreaEximClient {

  private final ProviderHttp http;
  private final String url, key;
  private final Clock clock;

  public KoreaEximClient(
    ProviderHttp http,
    @Value("${app.exchange-url}") String url,
    @Value("${app.exchange-key}") String key,
    Clock clock
  ) {
    this.http = http;
    this.url = url;
    this.key = key;
    this.clock = clock;
  }

  public ProviderModels.Exchange get(List<String> currencies) {
    if (http.demo()) return new ProviderModels.Exchange(
      currencies
        .stream()
        .map(c ->
          new ProviderModels.Rate(
            c,
            c + "/KRW",
            new java.math.BigDecimal(
              c.equals("USD")
                ? "1342.50"
                : c.equals("JPY")
                  ? "912.00"
                  : "1485.20"
            ),
            null,
            null,
            c,
            c.equals("JPY") ? 100 : 1
          )
        )
        .toList(),
      http.meta("샘플 환율")
    );
    ProviderHttp.requireKey(key);
    var now = LocalDateTime.now(clock);
    var date = now.toLocalDate();
    // 오전 공표 전/주말은 직전 평일을 조회. 공휴일 무응답은 거짓 환율 대신 명시적으로 안내합니다.
    if (now.getHour() < 12) date = date.minusDays(1);
    while (
        date.getDayOfWeek() == DayOfWeek.SATURDAY ||
        date.getDayOfWeek() == DayOfWeek.SUNDAY
      )
      date = date.minusDays(1);
    var uri = UriComponentsBuilder.fromUriString(url)
      .queryParam("authkey", "{key}")
      .queryParam("searchdate", date.format(DateTimeFormatter.BASIC_ISO_DATE))
      .queryParam("data", "AP01")
      .encode()
      .buildAndExpand(key)
      .toUri();
    var raw = http.get("KoreaExim", uri, java.util.Map.of());
    if (!raw.isArray() || raw.isEmpty()) throw new ApiException(
      503,
      "EXCHANGE_UNAVAILABLE",
      "환율 공표 전이거나 휴일이에요. 다음 영업일에 확인해 주세요."
    );
    var rates = Arrays.stream(
      ProviderHttp.decode(raw, KoreaEximResponse[].class)
    )
      .map(ExchangeRateMapper::map)
      .filter(r -> currencies.contains(r.currency()))
      .toList();
    return new ProviderModels.Exchange(
      rates,
      new ProviderModels.Meta(
        "한국수출입은행 · 매매기준율",
        "LIVE",
        date.atTime(11, 0).atZone(clock.getZone()).toInstant()
      )
    );
  }
}
