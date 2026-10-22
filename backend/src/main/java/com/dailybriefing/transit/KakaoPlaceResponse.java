package com.dailybriefing.transit;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoPlaceResponse(
  String id,
  String place_name,
  String category_name,
  String address_name,
  String road_address_name,
  String x,
  String y
) {}
