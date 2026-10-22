package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.*;
import com.dailybriefing.transit.*;
import com.dailybriefing.transit.MobilityModels.*;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class KakaoMapRouteTest {

  private static final Place START = new Place(
    null,
    "시청",
    "서울",
    37.5665,
    126.978,
    Source.GPS,
    null
  );
  private static final Place END = new Place(
    null,
    "도착역",
    "서울",
    37.5,
    127.0,
    Source.SEARCH,
    null
  );

  private java.util.List<Route> map(String json) throws Exception {
    var raw = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
    return KakaoMapRouteMapper.map(
      ProviderHttp.decode(raw, KakaoMapRouteResponse.class),
      START,
      END
    );
  }

  @Test
  void shortestSecondsWinBeforeRoundingAndFareAndCoordinatesAreMapped()
    throws Exception {
    var routes = map(Fixture.json("kakao-map-route").toString());
    assertThat(routes).hasSize(1);
    var r = routes.getFirst();
    assertThat(r.durationMinutes()).isEqualTo(20);
    assertThat(r.transferCount()).isEqualTo(1);
    assertThat(r.fareWon()).isEqualTo(1600);
    assertThat(r.steps().getFirst().path().getFirst()).isEqualTo(
      new Point(37.5665, 126.978)
    );
    assertThat(r.steps().getFirst().type()).isEqualTo(StepType.SUBWAY);
  }

  @Test
  void equalTimePrefersFewerTransfersAndMissingFareIsNotInvented()
    throws Exception {
    var json = Fixture.json("kakao-map-route")
      .toString()
      .replace("1199", "1200")
      .replace("\"value\":1500", "\"min\":1400,\"max\":1600");
    var route = map(json).getFirst();
    assertThat(route.transferCount()).isZero();
    assertThat(route.fareWon()).isNull();
  }

  @Test
  void noResultsIsEmptyAndMalformedOrUnknownResponseFails() throws Exception {
    for (var status : java.util.List.of(
      "NO_RESULTS",
      "STARTNODES_NULL",
      "ENDNODES_NULL"
    ))
      assertThat(map("{\"status\":\"" + status + "\"}")).isEmpty();
    for (var json : java.util.List.of(
      "{\"status\":\"OK\"}",
      "{\"status\":\"INVALID_REQUEST\"}",
      Fixture.json("kakao-map-route").toString().replace("1199", "-1"),
      Fixture.json("kakao-map-route").toString().replace("126.978", "999.0")
    )) {
      assertThatThrownBy(() -> map(json)).isInstanceOf(ApiException.class);
    }
    assertThatThrownBy(() ->
      map("{\"status\":\"EQUAL_POINTS\"}")
    ).isInstanceOfSatisfying(ApiException.class, e ->
      assertThat(e.code).isEqualTo("SAME_PLACE")
    );
  }

  @Test
  void httpUsesMapCoordinatesAndRestKeyWithoutAffiliateDateParameters()
    throws Exception {
    var query = new AtomicReference<String>();
    var auth = new AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    byte[] response = Fixture.json("kakao-map-route")
      .toString()
      .getBytes(StandardCharsets.UTF_8);
    server.createContext("/v2/routing/publictraffic", e -> {
      query.set(e.getRequestURI().getRawQuery());
      auth.set(e.getRequestHeaders().getFirst("Authorization"));
      e.getResponseHeaders().set("Content-Type", "application/json");
      e.sendResponseHeaders(200, response.length);
      e.getResponseBody().write(response);
      e.close();
    });
    server.start();
    try {
      var client = new KakaoMapRouteClient(
        new ProviderHttp("LIVE", 500, 1000, new SimpleMeterRegistry()),
        "http://127.0.0.1:" +
          server.getAddress().getPort() +
          "/v2/routing/publictraffic",
        "fixture-key"
      );
      assertThat(client.get(START, END).routes()).hasSize(1);
      assertThat(auth.get()).isEqualTo("KakaoAK fixture-key");
      assertThat(query.get())
        .contains(
          "start_x=126.978",
          "start_y=37.5665",
          "end_x=127.0",
          "end_y=37.5",
          "input_coord=WGS84",
          "output_coord=WGS84"
        )
        .doesNotContain("date=", "hhmmss=", "day_type=", "goal=");
    } finally {
      server.stop(0);
    }
  }
}
