package com.dailybriefing.news;

import org.springframework.stereotype.Component;

// NAVER 검색 결과는 뉴스 화면용입니다. AI inference/training client로 전달하지 않습니다.
@Component
public class NewsClient {

  private final NaverNewsClient client;

  public NewsClient(NaverNewsClient client) {
    this.client = client;
  }

  public NewsModels.Page get(NewsCategory category, int start, int display) {
    return client.get(category, start, display);
  }
}
