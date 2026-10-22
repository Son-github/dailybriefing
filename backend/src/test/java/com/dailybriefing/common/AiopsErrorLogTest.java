package com.dailybriefing.common;

import static org.junit.jupiter.api.Assertions.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;

class AiopsErrorLogTest {

  @Test
  void serverErrorsLogSafeCodeAndStatusWithoutOriginalMessage() {
    Logger logger = (Logger) LoggerFactory.getLogger(Errors.class);
    var events = new ListAppender<ILoggingEvent>();
    events.start();
    logger.addAppender(events);
    try {
      new Errors().api(
        new ApiException(504, "TIMEOUT", "private-password-and-provider-body"),
        new MockHttpServletRequest()
      );
      String message = events.list.getFirst().getFormattedMessage();
      assertTrue(
        message.contains(
          "errorCode=TIMEOUT httpStatus=504 exception=ApiException"
        )
      );
      assertFalse(message.contains("private-password"));
      assertNull(events.list.getFirst().getThrowableProxy());
    } finally {
      logger.detachAppender(events);
    }
  }

  @Test
  void validationErrorsDoNotTriggerErrorSubscription() {
    Logger logger = (Logger) LoggerFactory.getLogger(Errors.class);
    var events = new ListAppender<ILoggingEvent>();
    events.start();
    logger.addAppender(events);
    try {
      new Errors().api(
        new ApiException(400, "VALIDATION", "private-user-value"),
        new MockHttpServletRequest()
      );
      assertTrue(events.list.isEmpty());
    } finally {
      logger.detachAppender(events);
    }
  }
}
