package com.dailybriefing.news;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class NewsExecutorConfig {

  // 요청마다 Thread를 만들지 않습니다. 전체 뉴스 요청이 공유하는 5 worker + 제한된 대기열입니다.
  @Bean("newsExecutor")
  public ThreadPoolTaskExecutor newsExecutor() {
    var executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(5);
    executor.setQueueCapacity(25);
    executor.setThreadNamePrefix("news-provider-");
    executor.setWaitForTasksToCompleteOnShutdown(false);
    return executor;
  }
}
