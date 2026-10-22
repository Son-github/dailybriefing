package com.dailybriefing.weather;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KmaForecastItem(
  String category,
  String fcstValue,
  String fcstDate,
  String fcstTime,
  int nx,
  int ny
) {}
