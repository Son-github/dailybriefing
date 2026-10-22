package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.provider.*;
import com.dailybriefing.weather.*;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class KmaWeatherClientTest {

  @Test
  void decodingKeyIsEncodedExactlyOnceOnActualHttpRequest() throws Exception {
    var query = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    byte[] response = Fixture.json("kma-weather")
      .toString()
      .getBytes(StandardCharsets.UTF_8);
    server.createContext("/getVilageFcst", exchange -> {
      query.set(exchange.getRequestURI().getRawQuery());
      exchange.getResponseHeaders().set("Content-Type", "application/json");
      exchange.sendResponseHeaders(200, response.length);
      exchange.getResponseBody().write(response);
      exchange.close();
    });
    server.start();
    try {
      // 가짜 인증키입니다. + / =를 포함해 실제 네트워크 경계에서 중복 인코딩을 검출합니다.
      var client = new KmaWeatherClient(
        new ProviderHttp("LIVE", 500, 1000, new SimpleMeterRegistry()),
        "http://127.0.0.1:" + server.getAddress().getPort(),
        "fixture+key/value==",
        Clock.fixed(
          Instant.parse("2026-10-06T03:00:00Z"),
          ZoneId.of("Asia/Seoul")
        )
      );
      assertThat(client.get(37.5665, 126.978).temperature()).isEqualTo(21);
      assertThat(query.get())
        .contains("serviceKey=fixture%2Bkey%2Fvalue%3D%3D")
        .doesNotContain("%25");
      assertThat(
        URLDecoder.decode(query.get(), StandardCharsets.UTF_8)
      ).contains("serviceKey=fixture+key/value==");
      assertThat(query.get()).contains(
        "base_date=20261006",
        "base_time=1100",
        "nx=60",
        "ny=127",
        "dataType=JSON"
      );
    } finally {
      server.stop(0);
    }
  }

  @Test
  void encodedKeyAndApiHubMixupAreRejectedBeforeNetworkCall() {
    var http = new ProviderHttp("LIVE", 100, 100, new SimpleMeterRegistry());
    var clock = Clock.system(ZoneId.of("Asia/Seoul"));
    assertThatThrownBy(() ->
      new KmaWeatherClient(
        http,
        "http://127.0.0.1:1",
        "fixture%2Bkey%3D",
        clock
      ).get(37.5665, 126.978)
    ).isInstanceOfSatisfying(com.dailybriefing.common.ApiException.class, e ->
      assertThat(e.code).isEqualTo("KMA_KEY_ENCODING")
    );
    assertThatThrownBy(() ->
      new KmaWeatherClient(
        http,
        "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0",
        "fixture",
        clock
      ).get(37.5665, 126.978)
    ).isInstanceOfSatisfying(com.dailybriefing.common.ApiException.class, e ->
      assertThat(e.code).isEqualTo("KMA_ENDPOINT_MISMATCH")
    );
  }
}
