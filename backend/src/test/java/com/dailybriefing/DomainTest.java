package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.auth.AuthService;
import com.dailybriefing.dashboard.DashboardService;
import java.util.*;
import org.junit.jupiter.api.Test;

class DomainTest {

  @Test
  void widgetValidationRejectsDuplicatesAndGaps() {
    var w = DashboardService.defaults().widgets().getFirst();
    assertThatThrownBy(() ->
      DashboardService.validate(List.of(w, w))
    ).hasMessageContaining("위젯");
    assertThatThrownBy(() ->
      DashboardService.validate(
        List.of(
          new DashboardService.Widget(
            w.id(),
            w.type(),
            true,
            2,
            "MEDIUM",
            Map.of()
          )
        )
      )
    ).hasMessageContaining("위젯");
    DashboardService.validate(DashboardService.defaults().widgets());
  }

  @Test
  void cleanupCutoffPreservesBoundary() {
    assertThat(
      com.dailybriefing.calendar.CalendarCleanupService.cutoff(
        java.time.LocalDate.of(2028, 10, 5)
      )
    ).isEqualTo(java.time.LocalDate.of(2026, 10, 5));
  }

  @Test
  void refreshHashIsStableAndNotRaw() {
    assertThat(AuthService.hash("opaque"))
      .hasSize(64)
      .isEqualTo(AuthService.hash("opaque"))
      .isNotEqualTo("opaque");
  }
}
