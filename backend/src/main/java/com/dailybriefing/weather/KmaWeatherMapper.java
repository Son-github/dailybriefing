package com.dailybriefing.weather;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.ProviderModels;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public final class KmaWeatherMapper {

  public record Grid(int nx, int ny) {}

  // 기상청 Lambert conformal conic grid (5km). 서울시청은 nx=60, ny=127입니다.
  public static Grid grid(double lat, double lon) {
    double rad = Math.PI / 180,
      re = 6371.00877 / 5,
      sl1 = 30 * rad,
      sl2 = 60 * rad,
      olat = 38 * rad;
    double sn =
      Math.log(Math.cos(sl1) / Math.cos(sl2)) /
      Math.log(
        Math.tan(Math.PI / 4 + sl2 / 2) / Math.tan(Math.PI / 4 + sl1 / 2)
      );
    double sf =
      (Math.pow(Math.tan(Math.PI / 4 + sl1 / 2), sn) * Math.cos(sl1)) / sn;
    double ro = (re * sf) / Math.pow(Math.tan(Math.PI / 4 + olat / 2), sn);
    double ra =
        (re * sf) / Math.pow(Math.tan(Math.PI / 4 + (lat * rad) / 2), sn),
      theta = (lon - 126) * rad * sn;
    return new Grid(
      (int) Math.floor(ra * Math.sin(theta) + 43.5),
      (int) Math.floor(ro - ra * Math.cos(theta) + 136.5)
    );
  }

  public static LocalDateTime base(LocalDateTime now) {
    // 발표 후 10분 제공 지연을 반영. 새벽에는 전날 23시를 사용합니다.
    var ready = now.minusMinutes(10);
    for (int h : new int[] { 23, 20, 17, 14, 11, 8, 5, 2 })
      if (ready.getHour() >= h) return ready.toLocalDate().atTime(h, 0);
    return ready.toLocalDate().minusDays(1).atTime(23, 0);
  }

  public static ProviderModels.Weather map(
    List<KmaForecastItem> items,
    LocalDateTime now,
    ProviderModels.Meta meta
  ) {
    try {
      var times = new TreeMap<LocalDateTime, Map<String, String>>();
      for (var i : items) {
        var time = LocalDateTime.parse(
          i.fcstDate() + i.fcstTime(),
          DateTimeFormatter.ofPattern("yyyyMMddHHmm")
        );
        times
          .computeIfAbsent(time, k -> new HashMap<>())
          .put(i.category(), i.fcstValue());
      }
      var selected = times
        .entrySet()
        .stream()
        .filter(
          e ->
            !e.getKey().isBefore(now.withMinute(0).withSecond(0).withNano(0)) &&
            e.getValue().containsKey("TMP")
        )
        .findFirst()
        .orElseThrow(KmaWeatherMapper::unavailable);
      var values = selected.getValue();
      String pty = values.get("PTY"),
        sky = values.get("SKY");
      Double temperature = temperature(values.get("TMP"));
      if (
        temperature == null ||
        pty == null ||
        sky == null ||
        values.get("REH") == null ||
        values.get("POP") == null
      ) throw unavailable();
      int humidity = Integer.parseInt(values.get("REH"));
      int precipitation = Integer.parseInt(values.get("POP"));
      // 가이드: ±900 이상은 Missing, 해상은 기온/습도/강수확률을 마스킹합니다.
      if (
        humidity < 0 ||
        humidity > 100 ||
        precipitation < 0 ||
        precipitation > 100
      ) throw unavailable();
      if (
        !Set.of("0", "1", "2", "3", "4").contains(pty) ||
        !Set.of("1", "3", "4").contains(sky)
      ) throw unavailable();
      String condition = switch (pty) {
        case "1" -> "비";
        case "4" -> "소나기";
        case "2" -> "비 또는 눈";
        case "3" -> "눈";
        default -> switch (sky) {
          case "3" -> "구름 많음";
          case "4" -> "흐림";
          default -> "맑음";
        };
      };
      Double high = null,
        low = null;
      for (var e : times.entrySet())
        if (e.getKey().toLocalDate().equals(now.toLocalDate())) {
          if (e.getValue().containsKey("TMX")) high = temperature(
            e.getValue().get("TMX")
          );
          if (e.getValue().containsKey("TMN")) low = temperature(
            e.getValue().get("TMN")
          );
        }
      // 단기예보에는 체감온도가 없습니다. 없는 관측값/최고최저를 임의 생성하지 않습니다.
      return new ProviderModels.Weather(
        temperature,
        null,
        high,
        low,
        condition,
        humidity,
        precipitation,
        meta
      );
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
        502,
        "UPSTREAM_FORMAT",
        "날씨 정보 형식을 확인할 수 없어요."
      );
    }
  }

  private static Double temperature(String value) {
    if (value == null) return null;
    double parsed = Double.parseDouble(value);
    return !Double.isFinite(parsed) || Math.abs(parsed) >= 900 ? null : parsed;
  }

  private static ApiException unavailable() {
    return new ApiException(
      503,
      "WEATHER_UNAVAILABLE",
      "선택한 지역과 시각의 예보값을 제공하지 않아요."
    );
  }
}
