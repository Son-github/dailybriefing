package com.dailybriefing.news;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsPreferenceRepository
  extends JpaRepository<NewsPreference, UUID> {}
