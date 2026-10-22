package com.dailybriefing.calendar;

import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/calendar/holidays")
public class HolidayController {

  private final HolidayService service;

  public HolidayController(HolidayService service) {
    this.service = service;
  }

  @GetMapping
  public HolidayService.View get(
    @RequestParam @Min(1900) @Max(2200) int year,
    @RequestParam @Min(1) @Max(12) int month
  ) {
    return service.get(year, month);
  }
}
