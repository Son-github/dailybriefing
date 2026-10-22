package com.dailybriefing.user;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

  @Id
  public UUID id;

  @Column(nullable = false, unique = true)
  public String email;

  @Column(name = "password_hash", nullable = false)
  public String passwordHash;

  @Column(nullable = false)
  public String nickname;

  @Column(name = "created_at", nullable = false)
  public java.time.Instant createdAt;
}
