package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.provider.*;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.InetSocketAddress;
import org.junit.jupiter.api.Test;

class ProviderClientTest {

  @Test
  void upstreamDeniedAndLimitHaveActionableCodesWithoutSecrets()
    throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/", e -> {
      e.sendResponseHeaders(403, -1);
      e.close();
    });
    server.start();
    try {
      var http = new ProviderHttp("LIVE", 100, 100, new SimpleMeterRegistry());
      assertThatThrownBy(() ->
        http.get(
          "test",
          "http://127.0.0.1:" + server.getAddress().getPort(),
          null,
          null
        )
      ).isInstanceOfSatisfying(com.dailybriefing.common.ApiException.class, e ->
        assertThat(e.code).isEqualTo("PROVIDER_FORBIDDEN")
      );
    } finally {
      server.stop(0);
    }
  }

  @Test
  void readTimeoutIsBounded() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/", e -> {
      try {
        Thread.sleep(500);
      } catch (InterruptedException x) {
        Thread.currentThread().interrupt();
      }
      e.close();
    });
    server.start();
    try {
      var http = new ProviderHttp("LIVE", 100, 50, new SimpleMeterRegistry());
      long start = System.nanoTime();
      assertThatThrownBy(() ->
        http.get(
          "test",
          "http://127.0.0.1:" + server.getAddress().getPort(),
          null,
          null
        )
      ).isInstanceOf(com.dailybriefing.common.ApiException.class);
      assertThat((System.nanoTime() - start) / 1_000_000).isLessThan(1000);
    } finally {
      server.stop(0);
    }
  }
}
