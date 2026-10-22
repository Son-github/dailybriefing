package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.news.*;
import com.dailybriefing.provider.ProviderHttp;
import org.junit.jupiter.api.Test;

class NaverNewsMapperTest {

  @Test
  void stripsMarkupConvertsTimeAndKeepsSafeLinks() throws Exception {
    var item = NaverNewsMapper.map(
      ProviderHttp.decode(
        Fixture.json("naver-news").path("items").get(0),
        NaverNewsResponse.class
      ),
      "technology"
    );
    assertThat(item.title()).isEqualTo("오늘의 뉴스 \"AI\"");
    assertThat(item.summary()).contains("& 일상 '발전'");
    assertThat(item.publishedAt()).hasToString("2026-10-06T03:00:00Z");
    assertThat(item.originalUrl()).isEqualTo("https://example.com/article");
    assertThat(NaverNewsMapper.plain("<script>secret</script>safe")).isEqualTo(
      "safe"
    );
  }
}
