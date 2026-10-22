package com.dailybriefing.dashboard;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

  private final DashboardService service;

  public DashboardController(DashboardService s) {
    service = s;
  }

  @GetMapping
  public DashboardService.View get(@AuthenticationPrincipal Jwt j) {
    return service.get(j == null ? null : UUID.fromString(j.getSubject()));
  }

  @PutMapping
  public DashboardService.View put(
    @AuthenticationPrincipal Jwt j,
    @Valid @RequestBody DashboardService.Update in
  ) {
    return service.update(UUID.fromString(j.getSubject()), in);
  }
}
