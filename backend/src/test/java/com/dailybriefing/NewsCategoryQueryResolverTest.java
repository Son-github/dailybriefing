package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.news.NewsCategory;
import org.junit.jupiter.api.Test;

class NewsCategoryQueryResolverTest {

  @Test
  void mapsOnlyFiveAllowedQueries() {
    assertThat(
      java.util.Arrays.stream(NewsCategory.values())
        .map(NewsCategory::query)
        .toList()
    ).containsExactly("IT", "경제", "사회", "국제", "스포츠");
    assertThatThrownBy(() -> NewsCategory.parse("ABC")).hasMessageContaining(
      "카테고리"
    );
    assertThatThrownBy(() ->
      NewsCategory.parse("IT,ECONOMY")
    ).hasMessageContaining("카테고리");
  }
}
