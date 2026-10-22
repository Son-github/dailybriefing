package com.dailybriefing.auth;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "refresh_sessions")
public class RefreshSession {

  @Id
  public UUID id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "token_hash", unique = true)
  public String tokenHash;

  @Column(name = "family_id")
  public UUID familyId;

  @Column(name = "expires_at")
  public java.time.Instant expiresAt;

  public boolean revoked;
}
