// rule 기반 요약을 담당합니다. 외부 서비스 하나가 실패해도 가능한 부분은 계속 요약합니다.
package com.dailybriefing.briefing;

import com.dailybriefing.provider.*;
import com.dailybriefing.weather.WeatherClient;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class BriefingService {

  private final WeatherClient weather;
  private final ProviderHttp http;

  public BriefingService(WeatherClient w, ProviderHttp h) {
    weather = w;
    http = h;
  }

  public ProviderModels.Briefing get(double lat, double lon) {
    List<String> summaries = new ArrayList<>();
    try {
      var w = weather.get(lat, lon);
      summaries.add(
        w.temperature() >= 25
          ? "오늘은 가벼운 옷차림이 좋겠어요."
          : w.temperature() < 10
            ? "쌀쌀한 하루, 따뜻하게 챙겨 입으세요."
            : "산책하기 좋은 기온이에요."
      );
      if (w.precipitation() > 50) summaries.add(
        "외출할 때 우산을 챙겨 주세요."
      );
    } catch (com.dailybriefing.common.ApiException e) {
      summaries.add("날씨 요약은 잠시 쉬고 있어요.");
    }
    return new ProviderModels.Briefing(
      summaries,
      http.meta("Rule-based briefing")
    );
  }
}
