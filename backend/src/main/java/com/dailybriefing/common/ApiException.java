package com.dailybriefing.common;

public class ApiException extends RuntimeException {

  public final int status;
  public final String code;

  public final java.util.Map<String, Object> details;

  public ApiException(int status, String code, String message) {
    this(status, code, message, null);
  }

  public ApiException(
    int status,
    String code,
    String message,
    java.util.Map<String, Object> details
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details == null ? null : java.util.Map.copyOf(details);
  }
}
