package com.dailybriefing.news;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NaverNewsResponse(
  String title,
  String description,
  String originallink,
  String link,
  String pubDate
) {}
