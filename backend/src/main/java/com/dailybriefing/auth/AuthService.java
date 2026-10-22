// 회원가입은 기본 설정을 같은 transaction에서 생성합니다. 로그인/refresh는 동일한 토큰 발급 함수를 사용합니다.
package com.dailybriefing.auth;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.dashboard.DashboardService;
import com.dailybriefing.news.*;
import com.dailybriefing.user.*;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  public record Signup(
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 10, max = 72) String password,
    @NotBlank @Size(max = 40) String nickname
  ) {}

  public record Login(
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(max = 72) String password
  ) {}

  public record Result(
    String accessToken,
    UserService.Profile user,
    String refreshToken
  ) {}

  private final UserRepository users;
  private final UserPreferenceRepository prefs;
  private final NewsPreferenceRepository news;
  private final RefreshSessionRepository sessions;
  private final UserService profiles;
  private final DashboardService dashboards;
  private final PasswordEncoder passwords;
  private final JwtEncoder encoder;

  public AuthService(
    UserRepository u,
    UserPreferenceRepository p,
    NewsPreferenceRepository n,
    RefreshSessionRepository s,
    UserService us,
    DashboardService d,
    PasswordEncoder pw,
    JwtEncoder e
  ) {
    users = u;
    prefs = p;
    news = n;
    sessions = s;
    profiles = us;
    dashboards = d;
    passwords = pw;
    encoder = e;
  }

  @Transactional
  public Result signup(Signup in) {
    UserService.validatePassword(in.password());
    String email = in.email().trim().toLowerCase(Locale.ROOT);
    if (users.findByEmail(email).isPresent()) throw new ApiException(
      409,
      "EMAIL_EXISTS",
      "이미 가입된 이메일이에요."
    );
    var user = new User();
    user.id = UUID.randomUUID();
    user.email = email;
    user.passwordHash = passwords.encode(in.password());
    user.nickname = in.nickname().trim();
    user.createdAt = Instant.now();
    users.save(user);
    var pref = new UserPreference();
    pref.userId = user.id;
    prefs.save(pref);
    var np = new NewsPreference();
    np.userId = user.id;
    news.save(np);
    dashboards.create(user.id);
    return issue(user.id, UUID.randomUUID());
  }

  @Transactional
  public Result login(Login in) {
    var user = users
      .findByEmail(in.email().trim().toLowerCase(Locale.ROOT))
      .orElse(null);
    // Hash a dummy value to reduce obvious user enumeration timing differences.
    String hash =
      user == null
        ? "$2a$12$LeunMVXYfm8KEV9GH93pLeGYnBZJBVU2YuEvCxVeVUoR7NuHgDD5S"
        : user.passwordHash;
    if (!passwords.matches(in.password(), hash) || user == null) {
      org.slf4j.LoggerFactory.getLogger(getClass()).warn(
        "authentication_failure"
      );
      throw new ApiException(
        401,
        "LOGIN_FAILED",
        "이메일 또는 비밀번호를 확인해 주세요."
      );
    }
    return issue(user.id, UUID.randomUUID());
  }

  @Transactional(noRollbackFor = ApiException.class)
  public Result refresh(String token) {
    if (token == null || token.length() > 200) throw unauthorized();
    var session = sessions
      .lockedByHash(hash(token))
      .orElseThrow(AuthService::unauthorized);
    if (session.revoked) {
      sessions.revokeFamily(session.familyId);
      throw new ApiException(401, "REFRESH_REUSED", "다시 로그인해 주세요.");
    }
    if (session.expiresAt.isBefore(Instant.now())) {
      session.revoked = true;
      throw unauthorized();
    }
    session.revoked = true;
    sessions.flush();
    return issue(session.userId, session.familyId);
  }

  @Transactional
  public void logout(String token) {
    if (token != null && token.length() <= 200) sessions
      .lockedByHash(hash(token))
      .ifPresent(s -> sessions.revokeFamily(s.familyId));
  }

  private Result issue(UUID user, UUID family) {
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    var session = new RefreshSession();
    session.id = UUID.randomUUID();
    session.userId = user;
    session.familyId = family;
    session.tokenHash = hash(raw);
    session.expiresAt = Instant.now().plus(Duration.ofDays(14));
    sessions.saveAndFlush(session);
    Instant now = Instant.now();
    var claims = JwtClaimsSet.builder()
      .issuer("daily-briefing")
      .subject(user.toString())
      .issuedAt(now)
      .expiresAt(now.plus(Duration.ofMinutes(15)))
      .claim("sid", family.toString())
      .build();
    String access = encoder
      .encode(
        JwtEncoderParameters.from(
          JwsHeader.with(MacAlgorithm.HS256).build(),
          claims
        )
      )
      .getTokenValue();
    return new Result(access, profiles.get(user), raw);
  }

  public static String hash(String token) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(
          token.getBytes(StandardCharsets.UTF_8)
        )
      );
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private static ApiException unauthorized() {
    return new ApiException(401, "REFRESH_INVALID", "다시 로그인해 주세요.");
  }
}
