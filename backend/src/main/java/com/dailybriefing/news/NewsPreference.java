package com.dailybriefing.news;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "news_preferences")
public class NewsPreference {

  @Id
  @Column(name = "user_id")
  public UUID userId;

  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  public java.util.List<String> categories = new java.util.ArrayList<>(
    java.util.List.of("all")
  );

  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  public java.util.List<String> keywords = new java.util.ArrayList<>();
}
