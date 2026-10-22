package com.dailybriefing.transit;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mobility")
public class MobilityController {

  private final KakaoPlaceClient places;
  private final MobilityService routes;

  public MobilityController(KakaoPlaceClient places, MobilityService routes) {
    this.places = places;
    this.routes = routes;
  }

  @GetMapping("/places")
  public List<MobilityModels.Place> places(
    @RequestParam @NotBlank @Size(max = 80) String query
  ) {
    return places.search(query.trim());
  }

  @GetMapping("/location")
  public MobilityModels.Place location(
    @RequestParam @DecimalMin("-90") @DecimalMax("90") double latitude,
    @RequestParam @DecimalMin("-180") @DecimalMax("180") double longitude
  ) {
    return places.reverse(latitude, longitude);
  }

  public record Search(
    @NotNull @Valid MobilityModels.Place start,
    @NotNull @Valid MobilityModels.Place end
  ) {}

  // POST keeps precise GPS coordinates out of URLs/access logs. No database write is performed.
  @PostMapping("/routes")
  public MobilityModels.Routes routes(@RequestBody @Valid Search in) {
    return routes.routes(in.start(), in.end());
  }
}
