package com.dailybriefing.transit;

import static com.dailybriefing.transit.MobilityModels.*;

import com.dailybriefing.common.ApiException;
import java.util.*;
import java.util.stream.Collectors;

public final class KakaoMapRouteMapper {

  private KakaoMapRouteMapper() {}

  public static List<Route> map(
    KakaoMapRouteResponse response,
    Place start,
    Place end
  ) {
    if (response == null || response.status() == null) throw malformed();
    switch (response.status()) {
      case "NO_RESULTS", "STARTNODES_NULL", "ENDNODES_NULL":
        return List.of();
      case "EQUAL_POINTS":
        throw new ApiException(
          400,
          "SAME_PLACE",
          "서로 다른 장소를 선택해 주세요."
        );
      case "OK":
        break;
      default:
        throw new ApiException(
          502,
          "UPSTREAM_FORMAT",
          "경로 정보를 확인하지 못했어요. 장소를 다시 선택해 주세요."
        );
    }
    if (response.routes() == null) throw malformed();
    for (var candidate : response.routes()) validate(candidate);
    // 분 단위로 반올림하기 전에 원본 초로 비교합니다. 동률이면 환승, 거리 순입니다.
    return response
      .routes()
      .stream()
      .min(
        Comparator.comparingInt((KakaoMapRouteResponse.Candidate c) ->
          c.properties().totalTime()
        )
          .thenComparingInt(c -> c.properties().transfers())
          .thenComparingInt(c -> c.properties().totalDistance())
      )
      .map(c -> convert(c, start, end))
      .map(List::of)
      .orElseGet(List::of);
  }

  private static void validate(KakaoMapRouteResponse.Candidate c) {
    if (
      c == null ||
      c.properties() == null ||
      c.steps() == null ||
      c.steps().isEmpty()
    ) throw malformed();
    var p = c.properties();
    nonnegative(p.totalTime());
    nonnegative(p.totalDistance());
    nonnegative(p.transfers());
    if (p.fare() != null) {
      if (p.fare().value() != null) nonnegative(p.fare().value());
      if (p.fare().min() != null) nonnegative(p.fare().min());
      if (p.fare().max() != null) nonnegative(p.fare().max());
    }
    for (var s : c.steps()) {
      if (s == null || s.properties() == null) throw malformed();
      var q = s.properties();
      nonnegative(q.time());
      nonnegative(q.distance());
      type(q.type());
      if (
        q.stops() != null &&
        q
          .stops()
          .stream()
          .anyMatch(v -> v == null || v.name() == null)
      ) throw malformed();
      if (
        q.vehicles() != null &&
        q
          .vehicles()
          .stream()
          .anyMatch(v -> v == null || v.name() == null || v.type() == null)
      ) throw malformed();
      points(s);
    }
  }

  private static Route convert(
    KakaoMapRouteResponse.Candidate c,
    Place start,
    Place end
  ) {
    var steps = new ArrayList<Step>();
    for (int i = 0; i < c.steps().size(); i++) {
      var s = c.steps().get(i);
      var p = s.properties();
      var stops =
        p.stops() == null
          ? List.<String>of()
          : p.stops().stream().map(KakaoMapRouteResponse.Stop::name).toList();
      var vehicles =
        p.vehicles() == null
          ? List.<KakaoMapRouteResponse.Vehicle>of()
          : p.vehicles();
      var kind = type(p.type());
      String vehicle =
        kind == StepType.WALK
          ? "도보"
          : vehicles
              .stream()
              .map(KakaoMapRouteResponse.Vehicle::name)
              .distinct()
              .collect(Collectors.joining(" · "));
      String vehicleType = vehicles
        .stream()
        .map(KakaoMapRouteResponse.Vehicle::type)
        .distinct()
        .collect(Collectors.joining(" · "));
      steps.add(
        new Step(
          kind,
          p.guidance() == null
            ? kind == StepType.WALK
              ? "도보 이동"
              : "대중교통 이동"
            : p.guidance(),
          minutes(p.time()),
          p.distance(),
          vehicle,
          vehicleType,
          stops.isEmpty()
            ? i == 0
              ? start.name()
              : "이동 구간"
            : stops.getFirst(),
          stops.isEmpty()
            ? i == c.steps().size() - 1
              ? end.name()
              : "다음 구간"
            : stops.getLast(),
          stops,
          points(s)
        )
      );
    }
    var p = c.properties();
    String summary = steps
      .stream()
      .filter(s -> s.type() != StepType.WALK)
      .map(Step::vehicleName)
      .filter(s -> !s.isBlank())
      .collect(Collectors.joining(" → "));
    // value가 없을 때 최소 요금을 확정 요금으로 간주하지 않습니다.
    return new Route(
      minutes(p.totalTime()),
      p.totalDistance(),
      p.transfers(),
      p.fare() == null ? null : p.fare().value(),
      summary.isBlank() ? "이동 경로" : summary,
      steps
    );
  }

  private static List<Point> points(KakaoMapRouteResponse.Stage stage) {
    if (stage.path() == null || stage.path().points() == null) return List.of();
    return stage
      .path()
      .points()
      .stream()
      .map(p -> {
        if (
          p == null ||
          p.size() != 2 ||
          p.get(0) == null ||
          p.get(1) == null ||
          !Double.isFinite(p.get(0)) ||
          !Double.isFinite(p.get(1)) ||
          Math.abs(p.get(0)) > 180 ||
          Math.abs(p.get(1)) > 90
        ) throw malformed();
        return new Point(p.get(1), p.get(0));
      })
      .toList();
  }

  private static StepType type(String type) {
    if (type == null) throw malformed();
    return switch (type) {
      case "WALKING" -> StepType.WALK;
      case "BUS" -> StepType.BUS;
      case "SUBWAY" -> StepType.SUBWAY;
      default -> throw malformed();
    };
  }

  private static void nonnegative(Integer n) {
    if (n == null || n < 0) throw malformed();
  }

  private static int minutes(int seconds) {
    return (int) Math.ceil(seconds / 60.0);
  }

  private static ApiException malformed() {
    return new ApiException(
      502,
      "UPSTREAM_FORMAT",
      "경로 정보 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요."
    );
  }
}
