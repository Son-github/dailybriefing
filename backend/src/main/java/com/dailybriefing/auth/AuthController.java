package com.dailybriefing.auth;

import com.dailybriefing.user.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService service;
  private final boolean secure;

  public AuthController(
    AuthService s,
    @Value("${app.cookie-secure}") boolean secure
  ) {
    service = s;
    this.secure = secure;
  }

  public record Response(String accessToken, UserService.Profile user) {}

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken csrf) {
    return Map.of("token", csrf.getToken());
  }

  @PostMapping("/signup")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Response signup(
    @Valid @RequestBody AuthService.Signup input,
    HttpServletResponse response
  ) {
    return tokens(service.signup(input), response);
  }

  @PostMapping("/login")
  public Response login(
    @Valid @RequestBody AuthService.Login input,
    HttpServletResponse response
  ) {
    return tokens(service.login(input), response);
  }

  @PostMapping("/refresh")
  public Response refresh(
    @CookieValue(name = "refresh_token", required = false) String raw,
    HttpServletResponse response
  ) {
    try {
      return tokens(service.refresh(raw), response);
    } catch (com.dailybriefing.common.ApiException e) {
      cookie(response, "", Duration.ZERO);
      throw e;
    }
  }

  @PostMapping("/logout")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void logout(
    @CookieValue(name = "refresh_token", required = false) String raw,
    HttpServletResponse response
  ) {
    service.logout(raw);
    cookie(response, "", Duration.ZERO);
  }

  private Response tokens(AuthService.Result r, HttpServletResponse response) {
    cookie(response, r.refreshToken(), Duration.ofDays(14));
    return new Response(r.accessToken(), r.user());
  }

  private void cookie(HttpServletResponse response, String raw, Duration age) {
    response.addHeader(
      "Set-Cookie",
      ResponseCookie.from("refresh_token", raw)
        .httpOnly(true)
        .secure(secure)
        .sameSite("Lax")
        .path("/api/v1/auth")
        .maxAge(age)
        .build()
        .toString()
    );
  }
}
