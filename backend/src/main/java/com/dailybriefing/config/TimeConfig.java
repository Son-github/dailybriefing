package com.dailybriefing.config;

import java.time.*;
import org.springframework.context.annotation.*;

@Configuration
public class TimeConfig {

  // 날짜-only 일정은 UTC Instant로 바꾸지 않습니다. 테스트에서도 Clock을 고정할 수 있습니다.
  @Bean
  public Clock applicationClock() {
    return Clock.system(ZoneId.of("Asia/Seoul"));
  }
}
