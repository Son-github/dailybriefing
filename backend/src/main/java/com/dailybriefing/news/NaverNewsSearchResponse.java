package com.dailybriefing.news;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

// Pagination 메타데이터는 item DTO와 분리해 보존합니다. Controller는 raw DTO를 반환하지 않습니다.
@JsonIgnoreProperties(ignoreUnknown = true)
public record NaverNewsSearchResponse(
  int total,
  int start,
  int display,
  List<NaverNewsResponse> items
) {}
