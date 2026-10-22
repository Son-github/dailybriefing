package com.dailybriefing.transit;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "favorite_routes")
public class FavoriteRoute {

  @Id
  public UUID id;

  @Column(name = "user_id", nullable = false)
  public UUID userId;

  @Column(name = "start_place_id")
  public String startPlaceId;

  @Column(name = "start_place_name")
  public String startPlaceName;

  @Column(name = "end_place_id")
  public String endPlaceId;

  @Column(name = "end_place_name")
  public String endPlaceName;

  @Column(name = "route_name")
  public String routeName;

  @Column(name = "start_address")
  public String startAddress;

  @Column(name = "end_address")
  public String endAddress;

  @Column(name = "start_latitude")
  public Double startLatitude;

  @Column(name = "start_longitude")
  public Double startLongitude;

  @Column(name = "end_latitude")
  public Double endLatitude;

  @Column(name = "end_longitude")
  public Double endLongitude;

  @Column(name = "display_order")
  public int displayOrder;

  @Column(name = "created_at")
  public Instant createdAt;

  @Column(name = "updated_at")
  public Instant updatedAt;
}
