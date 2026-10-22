package com.dailybriefing.news;

import com.dailybriefing.provider.ProviderModels;
import java.util.List;

public final class NewsModels {

  private NewsModels() {}

  // start는 NAVER 결과의 1-based offset. nextStart는 받은 raw 결과 수만큼 이동합니다.
  public record Page(
    NewsCategory category,
    List<ProviderModels.Article> items,
    boolean hasMore,
    Integer nextStart,
    ProviderModels.Meta meta
  ) {}

  public record Failure(
    int status,
    String code,
    String message,
    String requestId,
    java.util.Map<String, Object> details
  ) {
    public Failure(int status, String code, String message, String requestId) {
      this(status, code, message, requestId, null);
    }
  }

  public record Section(
    NewsCategory category,
    List<ProviderModels.Article> items,
    boolean hasMore,
    Integer nextStart,
    ProviderModels.Meta meta,
    Failure error
  ) {
    public static Section success(Page page) {
      return new Section(
        page.category(),
        page.items(),
        page.hasMore(),
        page.nextStart(),
        page.meta(),
        null
      );
    }
  }

  public record Sections(
    Section it,
    Section economy,
    Section society,
    Section world,
    Section sports
  ) {}
}
