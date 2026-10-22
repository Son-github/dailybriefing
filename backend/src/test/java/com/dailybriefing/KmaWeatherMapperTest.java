package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.provider.*;
import com.dailybriefing.weather.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class KmaWeatherMapperTest {

  @Test
  void mapsForecastAndGridAndMidnightBase() throws Exception {
    var items = ProviderHttp.decode(
      Fixture.json("kma-weather")
        .path("response")
        .path("body")
        .path("items")
        .path("item"),
      KmaForecastItem[].class
    );
    var result = KmaWeatherMapper.map(
      Arrays.asList(items),
      LocalDateTime.of(2026, 10, 6, 12, 0),
      new ProviderModels.Meta("KMA", "LIVE", Instant.now())
    );
    assertThat(result.temperature()).isEqualTo(21);
    assertThat(result.feelsLike()).isNull();
    assertThat(result.high()).isEqualTo(24);
    assertThat(KmaWeatherMapper.grid(37.5665, 126.978)).isEqualTo(
      new KmaWeatherMapper.Grid(60, 127)
    );
    assertThat(
      KmaWeatherMapper.base(LocalDateTime.of(2026, 10, 6, 2, 9))
    ).isEqualTo(LocalDateTime.of(2026, 10, 5, 23, 0));
    assertThat(
      KmaWeatherMapper.base(LocalDateTime.of(2026, 10, 6, 2, 10))
    ).isEqualTo(LocalDateTime.of(2026, 10, 6, 2, 0));
  }

  @Test
  void missingValuesAreNotShownAsTemperatureAndShowersKeepTheirMeaning()
    throws Exception {
    var items = Arrays.asList(
      ProviderHttp.decode(
        Fixture.json("kma-weather")
          .path("response")
          .path("body")
          .path("items")
          .path("item"),
        KmaForecastItem[].class
      )
    );
    var now = LocalDateTime.of(2026, 10, 6, 12, 0);
    var meta = new ProviderModels.Meta("KMA", "LIVE", Instant.now());
    for (String missing : List.of("-999", "900", "NaN")) {
      var masked = items
        .stream()
        .map(i ->
          i.category().equals("TMP")
            ? new KmaForecastItem(
                "TMP",
                missing,
                i.fcstDate(),
                i.fcstTime(),
                i.nx(),
                i.ny()
              )
            : i
        )
        .toList();
      assertThatThrownBy(() ->
        KmaWeatherMapper.map(masked, now, meta)
      ).isInstanceOfSatisfying(com.dailybriefing.common.ApiException.class, e ->
        assertThat(e.code).isEqualTo("WEATHER_UNAVAILABLE")
      );
    }
    var showers = items
      .stream()
      .map(i ->
        new KmaForecastItem(
          i.category(),
          i.category().equals("PTY")
            ? "4"
            : i.category().equals("TMX")
              ? "-999"
              : i.fcstValue(),
          i.fcstDate(),
          i.fcstTime(),
          i.nx(),
          i.ny()
        )
      )
      .toList();
    var result = KmaWeatherMapper.map(showers, now, meta);
    assertThat(result.condition()).isEqualTo("소나기");
    assertThat(result.high()).isNull();
    assertThatThrownBy(() ->
      KmaWeatherMapper.map(
        items
          .stream()
          .filter(i -> !i.category().equals("SKY"))
          .toList(),
        now,
        meta
      )
    ).isInstanceOf(com.dailybriefing.common.ApiException.class);
  }
}
