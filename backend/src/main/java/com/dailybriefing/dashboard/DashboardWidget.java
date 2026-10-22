package com.dailybriefing.dashboard;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "dashboard_widgets")
public class DashboardWidget {

  @Id
  public UUID id;

  @Column(name = "dashboard_id")
  public UUID dashboardId;

  @Column(name = "widget_type")
  public String widgetType;

  public boolean enabled;
  public int position;
  public String size;

  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  public java.util.Map<String, Object> settings;
}
