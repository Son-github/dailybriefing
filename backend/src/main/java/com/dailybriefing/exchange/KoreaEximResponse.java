package com.dailybriefing.exchange;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KoreaEximResponse(
  int result,
  String cur_unit,
  String cur_nm,
  String deal_bas_r
) {}
