package com.dailybriefing.weather;

import com.dailybriefing.provider.ProviderModels;
import org.springframework.stereotype.Component;

// Widget/briefing의 안정적인 진입점. Provider 교체가 Controller로 퍼지지 않습니다.
@Component
public class WeatherClient {

  private final KmaWeatherClient client;

  public WeatherClient(KmaWeatherClient client) {
    this.client = client;
  }

  public ProviderModels.Weather get(double lat, double lon) {
    return client.get(lat, lon);
  }
}
