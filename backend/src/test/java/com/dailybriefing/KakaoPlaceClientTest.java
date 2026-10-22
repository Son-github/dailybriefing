package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.provider.ProviderHttp;
import com.dailybriefing.transit.KakaoPlaceClient;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class KakaoPlaceClientTest {

  @Test
  void koreanKeywordAndReservedCharactersAreEncodedOnce() throws Exception {
    var query = new AtomicReference<String>();
    var auth = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    byte[] response = Fixture.json("kakao-place")
      .toString()
      .getBytes(StandardCharsets.UTF_8);
    server.createContext("/v2/local/search/keyword.json", e -> {
      query.set(e.getRequestURI().getRawQuery());
      auth.set(e.getRequestHeaders().getFirst("Authorization"));
      e.getResponseHeaders().set("Content-Type", "application/json");
      e.sendResponseHeaders(200, response.length);
      e.getResponseBody().write(response);
      e.close();
    });
    server.start();
    try {
      var client = new KakaoPlaceClient(
        new ProviderHttp("LIVE", 500, 1000, new SimpleMeterRegistry()),
        "http://127.0.0.1:" + server.getAddress().getPort(),
        "fixture-key"
      );
      assertThat(client.search("서울역 + 1")).isNotEmpty();
      assertThat(query.get())
        .contains("query=%EC%84%9C%EC%9A%B8%EC%97%AD%20%2B%201", "size=15")
        .doesNotContain("%25");
      assertThat(
        URLDecoder.decode(query.get(), StandardCharsets.UTF_8)
      ).contains("query=서울역 + 1");
      assertThat(auth.get()).isEqualTo("KakaoAK fixture-key");
    } finally {
      server.stop(0);
    }
  }
}
