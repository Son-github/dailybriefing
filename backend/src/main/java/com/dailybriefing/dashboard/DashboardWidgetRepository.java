package com.dailybriefing.dashboard;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardWidgetRepository
  extends JpaRepository<DashboardWidget, UUID>
{
  java.util.List<DashboardWidget> findByDashboardIdOrderByPosition(UUID id);
  void deleteByDashboardId(UUID id);
}
