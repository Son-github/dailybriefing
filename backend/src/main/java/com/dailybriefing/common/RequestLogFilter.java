package com.dailybriefing.common;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(-200)
public class RequestLogFilter extends OncePerRequestFilter {

  private final Logger log = LoggerFactory.getLogger(getClass());

  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain chain
  ) throws ServletException, IOException {
    String candidate = request.getHeader("X-Request-ID");
    String id =
      candidate != null && candidate.matches("[a-zA-Z0-9_-]{1,64}")
        ? candidate
        : UUID.randomUUID().toString();
    MDC.put("requestId", id);
    response.setHeader("X-Request-ID", id);
    long start = System.nanoTime();
    try {
      chain.doFilter(request, response);
    } finally {
      log.info(
        "http method={} endpoint={} status={} latencyMs={}",
        request.getMethod(),
        request.getRequestURI(),
        response.getStatus(),
        (System.nanoTime() - start) / 1_000_000
      );
      MDC.clear();
    }
  }
}
