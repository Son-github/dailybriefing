// 위젯 구성은 서버에 저장하며 version 충돌로 다른 기기의 편집을 조용히 덮어쓰지 않습니다.
package com.dailybriefing.dashboard;

import com.dailybriefing.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

  public static final List<String> TYPES = List.of(
    "weather",
    "exchange",
    "transit",
    "calendar",
    "news"
  );

  public record Widget(
    @NotNull UUID id,
    @NotNull String type,
    boolean enabled,
    @Min(0) int order,
    @NotNull String size,
    @NotNull Map<String, Object> settings
  ) {}

  public record View(long version, List<Widget> widgets) {}

  public record Update(
    @Min(0) long version,
    @NotNull @Size(max = 20) List<@Valid Widget> widgets
  ) {}

  private final DashboardRepository dashboards;
  private final DashboardWidgetRepository widgets;

  public DashboardService(DashboardRepository d, DashboardWidgetRepository w) {
    dashboards = d;
    widgets = w;
  }

  public static View defaults() {
    List<Widget> out = new ArrayList<>();
    for (String t : List.of(
      "transit",
      "weather",
      "calendar",
      "exchange",
      "news"
    ))
      out.add(
        new Widget(
          UUID.nameUUIDFromBytes(
            t.getBytes(java.nio.charset.StandardCharsets.UTF_8)
          ),
          t,
          true,
          out.size(),
          t.equals("news") ? "LARGE" : "MEDIUM",
          Map.of()
        )
      );
    return new View(0, out);
  }

  @Transactional
  public void create(UUID user) {
    var d = new Dashboard();
    d.id = UUID.randomUUID();
    d.userId = user;
    dashboards.save(d);
    replace(d, defaults().widgets());
  }

  @Transactional(readOnly = true)
  public View get(UUID user) {
    if (user == null) return defaults();
    var d = dashboards.findByUserId(user).orElseThrow();
    return new View(
      d.version,
      widgets
        .findByDashboardIdOrderByPosition(d.id)
        .stream()
        .map(w ->
          new Widget(
            w.id,
            w.widgetType,
            w.enabled,
            w.position,
            w.size,
            w.settings
          )
        )
        .toList()
    );
  }

  public static void validate(List<Widget> list) {
    var types = new HashSet<String>();
    var ids = new HashSet<UUID>();
    var orders = new HashSet<Integer>();
    for (Widget w : list) {
      if (
        !TYPES.contains(w.type()) ||
        !types.add(w.type()) ||
        !ids.add(w.id()) ||
        !orders.add(w.order()) ||
        w.order() >= list.size() ||
        !Set.of("SMALL", "MEDIUM", "LARGE").contains(w.size()) ||
        w.settings().size() > 10
      ) throw new ApiException(
        400,
        "WIDGET_INVALID",
        "위젯 구성을 확인해 주세요."
      );
    }
  }

  @Transactional
  public View update(UUID user, Update input) {
    validate(input.widgets());
    var d = dashboards.findByUserId(user).orElseThrow();
    if (d.version != input.version()) throw new ApiException(
      409,
      "DASHBOARD_CONFLICT",
      "다른 곳에서 변경된 대시보드예요. 새로고침해 주세요."
    );
    // Force optimistic version increment even if only child widgets changed.
    d.updatedAt = java.time.Instant.now();
    replace(d, input.widgets());
    dashboards.flush();
    return get(user);
  }

  private void replace(Dashboard d, List<Widget> list) {
    widgets.deleteByDashboardId(d.id);
    widgets.flush();
    for (Widget in : list) {
      var w = new DashboardWidget();
      w.id = UUID.randomUUID();
      w.dashboardId = d.id;
      w.widgetType = in.type();
      w.enabled = in.enabled();
      w.position = in.order();
      w.size = in.size();
      w.settings = in.settings();
      widgets.save(w);
    }
  }
}
