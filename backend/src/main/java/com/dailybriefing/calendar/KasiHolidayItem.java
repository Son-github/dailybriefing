package com.dailybriefing.calendar;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KasiHolidayItem(
  String locdate,
  String dateName,
  String isHoliday
) {}
