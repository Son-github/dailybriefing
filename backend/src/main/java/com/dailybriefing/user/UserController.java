package com.dailybriefing.user;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {

  private final UserService service;

  @org.springframework.beans.factory.annotation.Value("${app.cookie-secure}")
  private boolean cookieSecure;

  public UserController(UserService s) {
    service = s;
  }

  private UUID id(Jwt j) {
    return UUID.fromString(j.getSubject());
  }

  @GetMapping
  public UserService.Profile get(@AuthenticationPrincipal Jwt j) {
    return service.get(id(j));
  }

  @PutMapping
  public UserService.Profile update(
    @AuthenticationPrincipal Jwt j,
    @Valid @RequestBody UserService.Update in
  ) {
    return service.update(id(j), in);
  }

  @PutMapping("/password")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void password(
    @AuthenticationPrincipal Jwt j,
    @Valid @RequestBody UserService.PasswordChange in
  ) {
    service.changePassword(id(j), in);
  }

  @DeleteMapping
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void delete(
    @AuthenticationPrincipal Jwt j,
    @Valid @RequestBody UserService.DeleteAccount in,
    jakarta.servlet.http.HttpServletResponse response
  ) {
    service.delete(id(j), in.password());
    response.addHeader(
      "Set-Cookie",
      org.springframework.http.ResponseCookie.from("refresh_token", "")
        .httpOnly(true)
        .secure(cookieSecure)
        .sameSite("Lax")
        .path("/api/v1/auth")
        .maxAge(0)
        .build()
        .toString()
    );
  }
}
