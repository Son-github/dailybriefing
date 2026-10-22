package com.dailybriefing.news;

import com.dailybriefing.common.ApiException;

// NAVER에는 category 파라미터가 없습니다. 검색어 매핑은 이곳에서만 관리합니다.
public enum NewsCategory {
  IT("IT"),
  ECONOMY("경제"),
  SOCIETY("사회"),
  WORLD("국제"),
  SPORTS("스포츠");

  private final String query;

  NewsCategory(String query) {
    this.query = query;
  }

  public String query() {
    return query;
  }

  public static NewsCategory parse(String value) {
    try {
      return valueOf(value);
    } catch (RuntimeException e) {
      throw new ApiException(
        400,
        "CATEGORY_INVALID",
        "지원하는 뉴스 카테고리를 선택해 주세요."
      );
    }
  }
}
