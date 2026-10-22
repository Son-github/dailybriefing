package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.news.*;
import com.dailybriefing.provider.*;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class NaverNewsClientTest {

  @Test
  void forwardsPageQueryHeadersAndPreservesProviderOrder() throws Exception {
    var query = new AtomicReference<String>();
    var rawQuery = new AtomicReference<String>();
    var legacyHeader = new AtomicReference<String>();
    var headers = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/search/v1/news", e -> {
      rawQuery.set(e.getRequestURI().getRawQuery());
      legacyHeader.set(e.getRequestHeaders().getFirst("X-Naver-Client-Id"));
      query.set(
        java.net.URLDecoder.decode(
          e.getRequestURI().getRawQuery(),
          StandardCharsets.UTF_8
        )
      );
      headers.set(
        e.getRequestHeaders().getFirst("X-NCP-APIGW-API-KEY-ID") +
          ":" +
          e.getRequestHeaders().getFirst("X-NCP-APIGW-API-KEY")
      );
      byte[] response = """
      {"total":100,"start":6,"display":10,"items":[
      {"title":"older first","description":"<b>original</b>","link":"https://example.com/a","pubDate":"Mon, 05 Oct 2026 12:00:00 +0900"},
      {"title":"newer second","description":"description","link":"https://example.com/b","pubDate":"Tue, 06 Oct 2026 12:00:00 +0900"}]}
      """.getBytes(StandardCharsets.UTF_8);
      e.getResponseHeaders().set("Content-Type", "text/plain;charset=UTF-8");
      e.sendResponseHeaders(200, response.length);
      e.getResponseBody().write(response);
      e.close();
    });
    server.start();
    try {
      var client = new NaverNewsClient(
        new ProviderHttp("LIVE", 500, 500, new SimpleMeterRegistry()),
        "http://127.0.0.1:" + server.getAddress().getPort(),
        "fixture-id",
        "fixture-secret"
      );
      var result = client.get(NewsCategory.ECONOMY, 6, 10);
      assertThat(query.get()).isEqualTo(
        "query=경제&display=10&start=6&sort=date&format=json"
      );
      assertThat(rawQuery.get())
        .contains("query=%EA%B2%BD%EC%A0%9C")
        .doesNotContain("%25");
      assertThat(legacyHeader.get()).isNull();
      assertThat(headers.get()).isEqualTo("fixture-id:fixture-secret");
      assertThat(result.items())
        .extracting(ProviderModels.Article::title)
        .containsExactly("older first", "newer second");
      assertThat(result.nextStart()).isEqualTo(8);
      assertThat(result.hasMore()).isTrue();
    } finally {
      server.stop(0);
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(ints = { 401, 403, 429 })
  void hubErrorsAreActionableWithoutExposingCredentials(int status)
    throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/search/v1/news", e -> {
      byte[] response =
        "{\"error\":{\"errorCode\":\"200\",\"message\":\"fixture-secret\"}}".getBytes(
          StandardCharsets.UTF_8
        );
      e.getResponseHeaders().set("Content-Type", "application/json");
      e.sendResponseHeaders(status, response.length);
      e.getResponseBody().write(response);
      e.close();
    });
    server.start();
    try {
      var client = new NaverNewsClient(
        new ProviderHttp("LIVE", 500, 500, new SimpleMeterRegistry()),
        "http://127.0.0.1:" + server.getAddress().getPort(),
        "fixture-id",
        "fixture-secret"
      );
      String expected =
        status == 401
          ? "PROVIDER_AUTH"
          : status == 403
            ? "PROVIDER_FORBIDDEN"
            : "PROVIDER_LIMIT";
      assertThatThrownBy(() ->
        client.get(NewsCategory.IT, 1, 5)
      ).isInstanceOfSatisfying(
        com.dailybriefing.common.ApiException.class,
        e -> {
          assertThat(e.code).isEqualTo(expected);
          assertThat(e.getMessage()).doesNotContain(
            "fixture-secret",
            "fixture-id"
          );
        }
      );
    } finally {
      server.stop(0);
    }
  }

  @Test
  void demoEmptyLastPageHasNoFurtherRequest() {
    var client = new NaverNewsClient(
      new ProviderHttp("DEMO", 500, 500, new SimpleMeterRegistry()),
      "",
      "",
      ""
    );
    var last = client.get(NewsCategory.IT, 46, 10);
    assertThat(last.items()).hasSize(5);
    assertThat(last.hasMore()).isFalse();
    assertThat(last.nextStart()).isNull();
    assertThat(client.get(NewsCategory.IT, 51, 10).items()).isEmpty();
  }
}
