package com.dailybriefing.transit;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/mobility/favorites")
public class FavoriteRouteController {

  private final FavoriteRouteService service;

  public FavoriteRouteController(FavoriteRouteService service) {
    this.service = service;
  }

  private UUID user(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  @GetMapping
  public List<FavoriteRouteService.View> list(
    @AuthenticationPrincipal Jwt jwt
  ) {
    return service.list(user(jwt));
  }

  @PostMapping
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public FavoriteRouteService.View create(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody FavoriteRouteService.Input in
  ) {
    return service.create(user(jwt), in);
  }

  @PatchMapping("/{id}")
  public FavoriteRouteService.View update(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable UUID id,
    @Valid @RequestBody FavoriteRouteService.Update in
  ) {
    return service.update(user(jwt), id, in);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    service.delete(user(jwt), id);
  }
}
