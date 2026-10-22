package com.dailybriefing.calendar;

import org.slf4j.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
  name = "app.calendar-cleanup-enabled",
  havingValue = "true",
  matchIfMissing = true
)
public class CalendarCleanupScheduler {

  private final CalendarCleanupService service;
  private static final Logger log = LoggerFactory.getLogger(
    CalendarCleanupScheduler.class
  );

  public CalendarCleanupScheduler(CalendarCleanupService service) {
    this.service = service;
  }

  // ECS 다중 replica에서는 이 환경값을 한 작업 인스턴스에서만 true로 지정하세요.
  @Scheduled(
    cron = "${app.calendar-cleanup-cron:0 0 3 * * *}",
    zone = "Asia/Seoul"
  )
  public void run() {
    try {
      log.info("calendar_cleanup_completed deletedEvents={}", service.clean());
    } catch (Exception ex) {
      log.error(
        "calendar_cleanup_failed errorType={}",
        ex.getClass().getSimpleName()
      );
    }
  }
}
