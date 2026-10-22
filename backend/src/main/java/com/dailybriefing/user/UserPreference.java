package com.dailybriefing.user;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "user_preferences")
public class UserPreference {

  @Id
  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "location_name")
  public String locationName = "서울";

  public double latitude = 37.5665;
  public double longitude = 126.978;
  public String theme = "SYSTEM";
  public boolean onboarded = false;
}
