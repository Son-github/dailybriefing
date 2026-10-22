package com.dailybriefing.auth;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshSessionRepository
  extends JpaRepository<RefreshSession, UUID>
{
  @org.springframework.data.jpa.repository.Lock(
    jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
  )
  @org.springframework.data.jpa.repository.Query(
    "select s from RefreshSession s where s.tokenHash = :hash"
  )
  java.util.Optional<RefreshSession> lockedByHash(
    @org.springframework.data.repository.query.Param("hash") String hash
  );

  boolean existsByFamilyIdAndRevokedFalseAndExpiresAtAfter(
    UUID family,
    java.time.Instant now
  );

  @org.springframework.data.jpa.repository.Modifying
  @org.springframework.data.jpa.repository.Query(
    "update RefreshSession s set s.revoked=true where s.familyId=:family"
  )
  void revokeFamily(
    @org.springframework.data.repository.query.Param("family") UUID family
  );

  @org.springframework.data.jpa.repository.Modifying
  @org.springframework.data.jpa.repository.Query(
    "update RefreshSession s set s.revoked=true where s.userId=:user"
  )
  void revokeUser(
    @org.springframework.data.repository.query.Param("user") UUID user
  );
}
