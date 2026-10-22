package com.dailybriefing.auth;

import com.dailybriefing.common.Errors;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(-190)
public class AuthRateLimitFilter extends OncePerRequestFilter {

  // API 응답 cache가 아닌 제한된 인증 시도 집계입니다. Caffeine/Redis dependency는 사용하지 않습니다.
  private record Window(long started, int count) {}

  private final Map<String, Window> attempts = new HashMap<>();

  private synchronized boolean exceeded(String address) {
    long now = System.nanoTime();
    long minute = 60_000_000_000L;
    attempts.entrySet().removeIf(e -> now - e.getValue().started() >= minute);
    var window = attempts.get(address);
    if (window == null && attempts.size() >= 10000) return true;
    window =
      window == null
        ? new Window(now, 1)
        : new Window(window.started(), window.count() + 1);
    attempts.put(address, window);
    return window.count() > 20;
  }

  private final ObjectMapper mapper;

  public AuthRateLimitFilter(ObjectMapper m) {
    mapper = m;
  }

  protected void doFilterInternal(
    HttpServletRequest r,
    HttpServletResponse s,
    FilterChain chain
  ) throws ServletException, IOException {
    if (
      r.getMethod().equals("POST") &&
      (r.getRequestURI().equals("/api/v1/auth/login") ||
        r.getRequestURI().equals("/api/v1/auth/signup")) &&
      exceeded(r.getRemoteAddr())
    ) {
      s.setStatus(429);
      s.setHeader("Retry-After", "60");
      s.setContentType("application/json");
      mapper.writeValue(
        s.getOutputStream(),
        Errors.body(
          429,
          "RATE_LIMIT",
          "잠시 후 다시 시도해 주세요.",
          r.getRequestURI(),
          null
        )
      );
      return;
    }
    chain.doFilter(r, s);
  }
}
