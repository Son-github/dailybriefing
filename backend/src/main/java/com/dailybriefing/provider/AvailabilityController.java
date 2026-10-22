package com.dailybriefing.provider;

import java.util.Map;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** CloudFront의 /api/*를 통과하는 readiness 확인. DB/내부 health 상세는 노출하지 않습니다. */
@RestController
public class AvailabilityController {

  private final HealthEndpoint health;

  public AvailabilityController(HealthEndpoint health) {
    this.health = health;
  }

  @GetMapping("/api/v1/health")
  public ResponseEntity<Map<String, String>> get() {
    boolean up = Status.UP.equals(health.health().getStatus());
    return ResponseEntity.status(up ? 200 : 503)
      .cacheControl(CacheControl.noStore())
      .body(Map.of("status", up ? "UP" : "DOWN"));
  }
}
