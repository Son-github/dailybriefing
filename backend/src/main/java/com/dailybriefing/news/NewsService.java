package com.dailybriefing.news;

import com.dailybriefing.common.ApiException;
import java.util.*;
import java.util.concurrent.*;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class NewsService {

  private final NewsClient client;
  private final Executor executor;

  public NewsService(
    NewsClient client,
    @Qualifier("newsExecutor") Executor executor
  ) {
    this.client = client;
    this.executor = executor;
  }

  public NewsModels.Page get(NewsCategory category, int start, int display) {
    if (
      category == null ||
      start < 1 ||
      start > 1000 ||
      display < 1 ||
      display > 100
    ) throw new ApiException(
      400,
      "NEWS_PAGE_INVALID",
      "뉴스 조회 범위를 확인해 주세요."
    );
    return client.get(category, start, Math.min(display, 1001 - start));
  }

  public NewsModels.Sections sections() {
    var pending = new EnumMap<
      NewsCategory,
      CompletableFuture<NewsModels.Section>
    >(NewsCategory.class);
    var context = MDC.getCopyOfContextMap();
    String requestId = MDC.get("requestId");
    for (var category : NewsCategory.values()) {
      try {
        pending.put(
          category,
          CompletableFuture.supplyAsync(() -> {
            // 공유 worker의 MDC는 반드시 복원해 사용자 간 requestId가 섞이지 않게 합니다.
            var previous = MDC.getCopyOfContextMap();
            try {
              if (context != null) MDC.setContextMap(context);
              else MDC.clear();
              return NewsModels.Section.success(get(category, 1, 5));
            } finally {
              if (previous != null) MDC.setContextMap(previous);
              else MDC.clear();
            }
          }, executor)
            .orTimeout(8, TimeUnit.SECONDS)
            .handle((section, error) ->
              error == null ? section : failure(category, error, requestId)
            )
        );
      } catch (RejectedExecutionException e) {
        pending.put(
          category,
          CompletableFuture.completedFuture(
            failure(
              category,
              new ApiException(
                503,
                "NEWS_BUSY",
                "뉴스 조회가 잠시 몰리고 있어요."
              ),
              requestId
            )
          )
        );
      }
    }
    return new NewsModels.Sections(
      pending.get(NewsCategory.IT).join(),
      pending.get(NewsCategory.ECONOMY).join(),
      pending.get(NewsCategory.SOCIETY).join(),
      pending.get(NewsCategory.WORLD).join(),
      pending.get(NewsCategory.SPORTS).join()
    );
  }

  private NewsModels.Section failure(
    NewsCategory category,
    Throwable error,
    String requestId
  ) {
    while (error instanceof CompletionException && error.getCause() != null)
      error = error.getCause();
    var problem =
      error instanceof ApiException a
        ? a
        : error instanceof TimeoutException
          ? new ApiException(504, "TIMEOUT", "뉴스 응답이 늦어지고 있어요.")
          : new ApiException(
              502,
              "UPSTREAM_ERROR",
              "뉴스를 불러오지 못했어요."
            );
    return new NewsModels.Section(
      category,
      List.of(),
      false,
      null,
      null,
      new NewsModels.Failure(
        problem.status,
        problem.code,
        problem.getMessage(),
        requestId,
        problem.details
      )
    );
  }
}
