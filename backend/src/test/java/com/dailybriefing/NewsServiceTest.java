package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.news.*;
import com.dailybriefing.provider.ProviderModels;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;

class NewsServiceTest {

  private NewsModels.Page page(NewsCategory category, int start) {
    return new NewsModels.Page(
      category,
      List.of(),
      true,
      start + 5,
      new ProviderModels.Meta("NAVER", "LIVE", Instant.now())
    );
  }

  @Test
  void fiveRequestsRunConcurrentlyAndOneFailureDoesNotDiscardOthers()
    throws Exception {
    var client = mock(NewsClient.class);
    var gate = new CyclicBarrier(5);
    when(client.get(any(), eq(1), eq(5))).thenAnswer(call -> {
      gate.await(2, TimeUnit.SECONDS); // 순차 실행이면 barrier가 깨져 테스트가 실패합니다.
      NewsCategory category = call.getArgument(0);
      if (category == NewsCategory.SOCIETY) throw new ApiException(
        503,
        "PROVIDER_LIMIT",
        "일시적 제한"
      );
      return page(category, 1);
    });
    try (var executor = Executors.newFixedThreadPool(5)) {
      var result = new NewsService(client, executor).sections();
      assertThat(result.it().error()).isNull();
      assertThat(result.economy().error()).isNull();
      assertThat(result.society().error().code()).isEqualTo("PROVIDER_LIMIT");
      assertThat(result.world().error()).isNull();
      assertThat(result.sports().error()).isNull();
      for (var category : NewsCategory.values())
        verify(client).get(category, 1, 5);
    }
  }

  @Test
  void paginationIsForwardedAndInvalidRequestsNeverReachProvider() {
    var client = mock(NewsClient.class);
    var expected = page(NewsCategory.IT, 6);
    when(client.get(NewsCategory.IT, 6, 10)).thenReturn(expected);
    var service = new NewsService(client, Runnable::run);
    assertThat(service.get(NewsCategory.IT, 6, 10)).isSameAs(expected);
    for (int start : new int[] { 0, 1001 })
      assertThatThrownBy(() ->
        service.get(NewsCategory.IT, start, 10)
      ).isInstanceOf(ApiException.class);
    assertThatThrownBy(() -> service.get(NewsCategory.IT, 1, 101)).isInstanceOf(
      ApiException.class
    );
    verify(client, times(1)).get(any(), anyInt(), anyInt());
  }

  @Test
  void saturatedExecutorReturnsIndependentRetryableErrors() {
    var service = new NewsService(mock(NewsClient.class), command -> {
      throw new RejectedExecutionException();
    });
    assertThat(service.sections().it().error().code()).isEqualTo("NEWS_BUSY");
  }
}
