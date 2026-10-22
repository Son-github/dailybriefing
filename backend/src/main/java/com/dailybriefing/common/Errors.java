package com.dailybriefing.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class Errors {

  public record ErrorBody(
    Instant timestamp,
    int status,
    String code,
    String message,
    String path,
    String requestId,
    Object details
  ) {}

  public static ErrorBody body(
    int status,
    String code,
    String message,
    String path,
    Object details
  ) {
    return new ErrorBody(
      Instant.now(),
      status,
      code,
      message,
      path,
      MDC.get("requestId"),
      details
    );
  }

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ErrorBody> api(ApiException e, HttpServletRequest r) {
    // AIOps ERROR 구독용 고정 필드만 기록합니다. 원문 메시지/요청 body/API 키는 출력하지 않습니다.
    if (e.status >= 500) org.slf4j.LoggerFactory.getLogger(Errors.class).error(
      "request_failed errorCode={} httpStatus={} exception={}",
      e.code,
      e.status,
      e.getClass().getSimpleName()
    );
    return ResponseEntity.status(e.status).body(
      body(e.status, e.code, e.getMessage(), r.getRequestURI(), e.details)
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ErrorBody> validation(
    MethodArgumentNotValidException e,
    HttpServletRequest r
  ) {
    var details = e
      .getBindingResult()
      .getFieldErrors()
      .stream()
      .map(x -> Map.of("field", x.getField(), "message", x.getDefaultMessage()))
      .toList();
    return ResponseEntity.badRequest().body(
      body(
        400,
        "VALIDATION",
        "입력값을 확인해 주세요.",
        r.getRequestURI(),
        details
      )
    );
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    org.springframework.web.method.annotation.HandlerMethodValidationException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.bind.MissingServletRequestParameterException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
  })
  ResponseEntity<ErrorBody> invalid(Exception e, HttpServletRequest r) {
    return ResponseEntity.badRequest().body(
      body(
        400,
        "VALIDATION",
        "요청 형식을 확인해 주세요.",
        r.getRequestURI(),
        null
      )
    );
  }

  @ExceptionHandler({
    DataIntegrityViolationException.class,
    ObjectOptimisticLockingFailureException.class,
  })
  ResponseEntity<ErrorBody> conflict(Exception e, HttpServletRequest r) {
    return ResponseEntity.status(409).body(
      body(
        409,
        "CONFLICT",
        "이미 등록되었거나 다른 곳에서 변경된 정보예요. 새로고침해 주세요.",
        r.getRequestURI(),
        null
      )
    );
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ErrorBody> unexpected(Exception e, HttpServletRequest r) {
    org.slf4j.LoggerFactory.getLogger(Errors.class).error(
      "request_failed errorCode=INTERNAL httpStatus=500 exception={}",
      e.getClass().getSimpleName()
    );
    return ResponseEntity.internalServerError().body(
      body(
        500,
        "INTERNAL",
        "잠시 후 다시 시도해 주세요.",
        r.getRequestURI(),
        null
      )
    );
  }
}
