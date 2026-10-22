package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.calendar.KasiHolidayClient;
import com.dailybriefing.provider.ProviderHttp;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class KasiHolidayClientTest {

  @Test
  void decodingKeyIsNotEncodedTwice() throws Exception {
    var query = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/getRestDeInfo", e -> {
      query.set(e.getRequestURI().getRawQuery());
      byte[] body =
        "{\"response\":{\"header\":{\"resultCode\":\"00\"},\"body\":{\"items\":\"\"}}}".getBytes(
          StandardCharsets.UTF_8
        );
      e.sendResponseHeaders(200, body.length);
      e.getResponseBody().write(body);
      e.close();
    });
    server.start();
    try {
      var client = new KasiHolidayClient(
        new ProviderHttp("LIVE", 500, 1000, new SimpleMeterRegistry()),
        "http://127.0.0.1:" + server.getAddress().getPort(),
        "fixture+key/value=="
      );
      assertThat(client.get(2026, 10)).isEmpty();
      assertThat(query.get())
        .contains("serviceKey=fixture%2Bkey%2Fvalue%3D%3D")
        .doesNotContain("%25");
    } finally {
      server.stop(0);
    }
  }
}
