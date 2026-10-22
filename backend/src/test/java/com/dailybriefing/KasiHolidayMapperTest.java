package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.calendar.*;
import org.junit.jupiter.api.Test;

class KasiHolidayMapperTest {

  @Test
  void mapsSingletonDateAndEmpty() throws Exception {
    var out = KasiHolidayMapper.map(
      Fixture.json("kasi-holiday")
        .path("response")
        .path("body")
        .path("items")
        .path("item")
    );
    assertThat(out).hasSize(1);
    assertThat(out.getFirst().date()).hasToString("2026-10-09");
    assertThat(out.getFirst().holiday()).isTrue();
    assertThat(
      KasiHolidayMapper.map(
        new com.fasterxml.jackson.databind.ObjectMapper().createArrayNode()
      )
    ).isEmpty();
  }
}
