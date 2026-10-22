package com.dailybriefing.user;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  java.util.Optional<User> findByEmail(String email);

  // 즐겨찾기 순서 변경과 탈퇴의 동시 실행에서 같은 user row를 잠급니다.
  @org.springframework.data.jpa.repository.Lock(
    jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
  )
  @org.springframework.data.jpa.repository.Query(
    "select u from User u where u.id = :id"
  )
  java.util.Optional<User> lockedById(
    @org.springframework.data.repository.query.Param("id") java.util.UUID id
  );
}
