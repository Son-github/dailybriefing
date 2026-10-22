package com.dailybriefing.dashboard;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "dashboards")
public class Dashboard {

  @Id
  public UUID id;

  @Column(name = "user_id", unique = true)
  public UUID userId;

  @Version
  public long version;

  @Column(name = "updated_at")
  public java.time.Instant updatedAt = java.time.Instant.now();
}
