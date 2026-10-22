package com.dailybriefing.calendar;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/calendar/events")
public class CalendarController {

  private final CalendarService service;

  public CalendarController(CalendarService service) {
    this.service = service;
  }

  private UUID user(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  @GetMapping
  public List<CalendarService.View> list(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam LocalDate from,
    @RequestParam LocalDate to
  ) {
    return service.list(user(jwt), from, to);
  }

  @GetMapping("/upcoming")
  public List<CalendarService.View> upcoming(@AuthenticationPrincipal Jwt jwt) {
    return service.upcoming(user(jwt));
  }

  @PostMapping
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public CalendarService.View create(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody CalendarService.Input in
  ) {
    return service.create(user(jwt), in);
  }

  @PatchMapping("/{id}")
  public CalendarService.View update(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable UUID id,
    @Valid @RequestBody CalendarService.Input in
  ) {
    return service.update(user(jwt), id, in);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    service.delete(user(jwt), id);
  }
}
