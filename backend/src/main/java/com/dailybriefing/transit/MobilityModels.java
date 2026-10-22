package com.dailybriefing.transit;

import com.dailybriefing.provider.ProviderModels.Meta;
import jakarta.validation.constraints.*;
import java.util.List;

public final class MobilityModels {

  public enum Source {
    GPS,
    SEARCH,
    MAP,
    KAKAO,
  }

  public enum StepType {
    WALK,
    BUS,
    SUBWAY,
  }

  public record Place(
    @Size(max = 80) String id,
    @NotBlank @Size(max = 200) String name,
    @NotNull @Size(max = 300) String address,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
    @NotNull Source source,
    @Size(max = 200) String category
  ) {}

  public record Point(double latitude, double longitude) {}

  public record Step(
    StepType type,
    String instruction,
    int durationMinutes,
    int distanceMeters,
    String vehicleName,
    String vehicleType,
    String startName,
    String endName,
    List<String> stops,
    List<Point> path
  ) {}

  public record Route(
    int durationMinutes,
    int distanceMeters,
    int transferCount,
    Integer fareWon,
    String summary,
    List<Step> steps
  ) {}

  public record Routes(List<Route> routes, Meta meta, String notice) {}
}
