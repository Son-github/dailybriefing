package com.dailybriefing.calendar;

import java.time.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CalendarCleanupService {

  private final CalendarEventRepository repository;
  private final Clock clock;

  public CalendarCleanupService(
    CalendarEventRepository repository,
    Clock clock
  ) {
    this.repository = repository;
    this.clock = clock;
  }

  // strict < : 2028-10-05 실행 시 2026-10-05 당일은 유지하고 그 이전만 삭제합니다.
  @Transactional
  public int clean() {
    return repository.deleteBefore(cutoff(LocalDate.now(clock)));
  }

  public static LocalDate cutoff(LocalDate today) {
    return today.minusYears(2);
  }
}
