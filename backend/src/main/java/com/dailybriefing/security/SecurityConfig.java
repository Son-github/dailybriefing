package com.dailybriefing.security;

import com.dailybriefing.auth.RefreshSessionRepository;
import com.dailybriefing.common.Errors;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecretKeySpec signingKey(@Value("${app.jwt-secret}") String secret) {
    if (
      secret.getBytes(StandardCharsets.UTF_8).length < 32
    ) throw new IllegalStateException("JWT_SECRET must have at least 32 bytes");
    return new SecretKeySpec(
      secret.getBytes(StandardCharsets.UTF_8),
      "HmacSHA256"
    );
  }

  @Bean
  JwtEncoder encoder(SecretKeySpec key) {
    return new NimbusJwtEncoder(
      new com.nimbusds.jose.jwk.source.ImmutableSecret<>(key)
    );
  }

  @Bean
  JwtDecoder decoder(SecretKeySpec key, RefreshSessionRepository sessions) {
    var decoder = NimbusJwtDecoder.withSecretKey(key)
      .macAlgorithm(MacAlgorithm.HS256)
      .build();
    OAuth2TokenValidator<Jwt> sessionValidator = jwt -> {
      try {
        if (
          sessions.existsByFamilyIdAndRevokedFalseAndExpiresAtAfter(
            UUID.fromString(jwt.getClaimAsString("sid")),
            Instant.now()
          )
        ) return OAuth2TokenValidatorResult.success();
      } catch (IllegalArgumentException ignored) {}
      return OAuth2TokenValidatorResult.failure(
        new OAuth2Error("invalid_token")
      );
    };
    decoder.setJwtValidator(
      new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer("daily-briefing"),
        sessionValidator
      )
    );
    return decoder;
  }

  @Bean
  SecurityFilterChain security(
    HttpSecurity http,
    ObjectMapper mapper,
    @Value("${app.frontend-urls}") String origins,
    @Value("${app.cookie-secure}") boolean secure
  ) throws Exception {
    var csrf = new CookieCsrfTokenRepository();
    csrf.setCookieCustomizer(c ->
      c.path("/").sameSite("Lax").secure(secure).httpOnly(false)
    );
    var handler = new CsrfTokenRequestAttributeHandler();
    handler.setCsrfRequestAttributeName(null);
    var cors = new CorsConfiguration();
    cors.setAllowedOrigins(java.util.Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
    cors.setAllowCredentials(true);
    cors.setAllowedMethods(
      List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
    );
    cors.setAllowedHeaders(
      List.of("Authorization", "Content-Type", "X-XSRF-TOKEN", "X-Request-ID")
    );
    cors.setExposedHeaders(
      List.of("X-Request-ID", "X-Data-Mode", "X-Data-Result")
    );
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cors);
    http
      .cors(c -> c.configurationSource(source))
      .csrf(c -> c.csrfTokenRepository(csrf).csrfTokenRequestHandler(handler))
      .sessionManagement(s ->
        s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )
      .authorizeHttpRequests(a ->
        a
          .requestMatchers(
            "/api/v1/auth/**",
            "/api/v1/health",
            "/api/v1/weather",
            "/api/v1/exchange-rates",
            "/api/v1/mobility/**",
            "/api/v1/calendar/holidays",
            "/api/v1/news",
            "/api/v1/news/sections",
            "/api/v1/briefing",
            "/actuator/health/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**"
          )
          .permitAll()
          .requestMatchers(
            org.springframework.http.HttpMethod.GET,
            "/api/v1/dashboard"
          )
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .oauth2ResourceServer(o ->
        o
          .jwt(j -> {})
          .authenticationEntryPoint((r, s, e) -> {
            s.setStatus(401);
            s.setContentType("application/json");
            mapper.writeValue(
              s.getOutputStream(),
              Errors.body(
                401,
                "UNAUTHORIZED",
                "로그인이 필요해요.",
                r.getRequestURI(),
                null
              )
            );
          })
      )
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((r, s, x) -> {
            s.setStatus(401);
            s.setContentType("application/json");
            mapper.writeValue(
              s.getOutputStream(),
              Errors.body(
                401,
                "UNAUTHORIZED",
                "로그인이 필요해요.",
                r.getRequestURI(),
                null
              )
            );
          })
          .accessDeniedHandler((r, s, x) -> {
            s.setStatus(403);
            s.setContentType("application/json");
            mapper.writeValue(
              s.getOutputStream(),
              Errors.body(
                403,
                "FORBIDDEN",
                "요청 권한 또는 보안 토큰을 확인해 주세요.",
                r.getRequestURI(),
                null
              )
            );
          })
      );
    return http.build();
  }
}
