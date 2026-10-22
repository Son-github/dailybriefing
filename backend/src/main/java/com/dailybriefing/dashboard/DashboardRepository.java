package com.dailybriefing.dashboard;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardRepository extends JpaRepository<Dashboard, UUID> {
  java.util.Optional<Dashboard> findByUserId(UUID userId);
}
