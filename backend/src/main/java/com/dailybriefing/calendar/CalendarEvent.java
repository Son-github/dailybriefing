package com.dailybriefing.calendar;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "calendar_events")
public class CalendarEvent {

  @Id
  public UUID id;

  @Column(name = "user_id", nullable = false)
  public UUID userId;

  public String title;

  @Column(name = "event_date", nullable = false)
  public LocalDate eventDate;

  @Column(name = "event_time")
  public LocalTime eventTime;

  public String description;
  public String location;

  @Column(name = "created_at", nullable = false)
  public Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  public Instant updatedAt;
}
