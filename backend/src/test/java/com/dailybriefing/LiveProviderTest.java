package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.provider.*;
import com.dailybriefing.weather.*;
import java.time.*;
import org.junit.jupiter.api.*;

@Tag("live")
class LiveProviderTest {

  @Test
  void kmaContractRequiresExplicitKey() {
    String key = System.getenv("KMA_API_KEY");
    Assumptions.assumeTrue(
      key != null && !key.isBlank(),
      "KMA_API_KEY is required"
    );
    var client = new KmaWeatherClient(
      new ProviderHttp(
        "LIVE",
        2000,
        4000,
        new io.micrometer.core.instrument.simple.SimpleMeterRegistry()
      ),
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0",
      key,
      Clock.system(ZoneId.of("Asia/Seoul"))
    );
    assertThat(client.get(37.5665, 126.978).meta().mode()).isEqualTo("LIVE");
  }
}
