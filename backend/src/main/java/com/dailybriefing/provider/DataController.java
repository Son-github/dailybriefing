package com.dailybriefing.provider;

import com.dailybriefing.briefing.*;
import com.dailybriefing.common.ApiException;
import com.dailybriefing.exchange.*;
import com.dailybriefing.weather.*;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class DataController {

  private final WeatherClient weather;
  private final ExchangeClient exchange;
  private final BriefingService briefing;

  public DataController(WeatherClient w, ExchangeClient e, BriefingService b) {
    weather = w;
    exchange = e;
    briefing = b;
  }

  @GetMapping("/weather")
  public ProviderModels.Weather weather(
    @RequestParam(defaultValue = "37.5665") @DecimalMin("-90") @DecimalMax(
      "90"
    ) double latitude,
    @RequestParam(defaultValue = "126.978") @DecimalMin("-180") @DecimalMax(
      "180"
    ) double longitude
  ) {
    return weather.get(latitude, longitude);
  }

  @GetMapping("/exchange-rates")
  public ProviderModels.Exchange exchange(
    @RequestParam(defaultValue = "USD,JPY,EUR") List<String> pairs
  ) {
    if (
      pairs.isEmpty() ||
      pairs.size() > 10 ||
      pairs.stream().anyMatch(x -> !x.matches("[A-Z]{3}") || x.equals("KRW"))
    ) throw new ApiException(
      400,
      "CURRENCY_INVALID",
      "통화 코드를 확인해 주세요."
    );
    return exchange.get(pairs.stream().distinct().toList());
  }

  @GetMapping("/briefing")
  public ProviderModels.Briefing briefing(
    @RequestParam(defaultValue = "37.5665") @DecimalMin("-90") @DecimalMax(
      "90"
    ) double latitude,
    @RequestParam(defaultValue = "126.978") @DecimalMin("-180") @DecimalMax(
      "180"
    ) double longitude
  ) {
    return briefing.get(latitude, longitude);
  }
}
