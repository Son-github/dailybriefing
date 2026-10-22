package com.dailybriefing.transit;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRouteRepository
  extends JpaRepository<FavoriteRoute, UUID>
{
  List<FavoriteRoute> findByUserIdOrderByDisplayOrderAscCreatedAtAsc(UUID user);
  Optional<FavoriteRoute> findByIdAndUserId(UUID id, UUID user);
}
