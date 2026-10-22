package com.dailybriefing.transit;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

// 외부 JSON 규격만 표현합니다. 화면에 전달하는 모델은 Mapper에서 분리합니다.
@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoMapRouteResponse(String status, List<Candidate> routes) {
  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Candidate(Properties properties, List<Stage> steps) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Properties(
    String type,
    Integer totalDistance,
    Integer totalTime,
    Integer transfers,
    Fare fare
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Fare(Integer value, Integer min, Integer max) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Stage(StageProperties properties, Path path) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record StageProperties(
    String guidance,
    String type,
    Integer distance,
    Integer time,
    List<Stop> stops,
    List<Vehicle> vehicles
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Stop(String name) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Vehicle(String name, String type) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Path(List<List<Double>> points) {}
}
