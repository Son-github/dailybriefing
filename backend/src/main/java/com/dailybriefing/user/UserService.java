// 사용자 프로필과 개인 선호의 변경을 담당합니다. 비밀번호 변경은 전체 세션을 폐기합니다.
package com.dailybriefing.user;

import com.dailybriefing.auth.RefreshSessionRepository;
import com.dailybriefing.common.ApiException;
import com.dailybriefing.news.*;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

  private final UserRepository users;
  private final UserPreferenceRepository preferences;
  private final NewsPreferenceRepository news;
  private final RefreshSessionRepository sessions;
  private final PasswordEncoder passwords;

  public UserService(
    UserRepository u,
    UserPreferenceRepository p,
    NewsPreferenceRepository n,
    RefreshSessionRepository s,
    PasswordEncoder encoder
  ) {
    users = u;
    preferences = p;
    news = n;
    sessions = s;
    passwords = encoder;
  }

  public record Profile(
    UUID id,
    String email,
    String nickname,
    String locationName,
    double latitude,
    double longitude,
    String theme,
    boolean onboarded,
    List<String> categories,
    List<String> keywords
  ) {}

  public record Update(
    @NotBlank @Size(max = 40) String nickname,
    @NotBlank @Size(max = 80) String locationName,
    @DecimalMin("-90") @DecimalMax("90") double latitude,
    @DecimalMin("-180") @DecimalMax("180") double longitude,
    @Pattern(regexp = "LIGHT|DARK|SYSTEM") @NotNull String theme,
    boolean onboarded,
    @NotEmpty
    @Size(max = 6)
    List<@Pattern(
      regexp = "all|business|technology|general|world|sports"
    ) String> categories,
    @NotNull @Size(max = 10) List<@NotBlank @Size(max = 40) String> keywords
  ) {}

  public record PasswordChange(
    @NotBlank String currentPassword,
    @NotBlank @Size(min = 10, max = 72) String newPassword
  ) {}

  public record DeleteAccount(@NotBlank String password) {}

  @Transactional(readOnly = true)
  public Profile get(UUID id) {
    User u = users
      .findById(id)
      .orElseThrow(() ->
        new ApiException(401, "UNAUTHORIZED", "로그인이 필요해요.")
      );
    var p = preferences.findById(id).orElseThrow();
    var n = news.findById(id).orElseThrow();
    return new Profile(
      id,
      u.email,
      u.nickname,
      p.locationName,
      p.latitude,
      p.longitude,
      p.theme,
      p.onboarded,
      n.categories,
      n.keywords
    );
  }

  @Transactional
  public Profile update(UUID id, Update input) {
    var u = users.findById(id).orElseThrow();
    var p = preferences.findById(id).orElseThrow();
    var n = news.findById(id).orElseThrow();
    u.nickname = input.nickname().trim();
    p.locationName = input.locationName().trim();
    p.latitude = input.latitude();
    p.longitude = input.longitude();
    p.theme = input.theme();
    p.onboarded = input.onboarded();
    n.categories = input.categories().stream().distinct().toList();
    n.keywords = input
      .keywords()
      .stream()
      .map(String::trim)
      .distinct()
      .toList();
    return get(id);
  }

  @Transactional
  public void changePassword(UUID id, PasswordChange input) {
    var u = users.findById(id).orElseThrow();
    checkPassword(u, input.currentPassword());
    validatePassword(input.newPassword());
    u.passwordHash = passwords.encode(input.newPassword());
    sessions.revokeUser(id);
  }

  @Transactional
  public void delete(UUID id, String password) {
    var u = users.findById(id).orElseThrow();
    checkPassword(u, password);
    // 삭제 책임은 migration의 FK ON DELETE CASCADE입니다. 자식 Entity를 하나씩 로딩하지 않습니다.
    // refresh session도 DB에서 사라지므로 기존 access token의 sid 검증도 즉시 실패합니다.
    users.lockedById(id).orElseThrow();
    users.delete(u);
    users.flush();
    org.slf4j.LoggerFactory.getLogger(getClass()).info(
      "account_deletion_completed"
    );
  }

  private void checkPassword(User u, String p) {
    if (!passwords.matches(p, u.passwordHash)) throw new ApiException(
      400,
      "PASSWORD_INVALID",
      "현재 비밀번호를 확인해 주세요."
    );
  }

  public static void validatePassword(String p) {
    if (
      p.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
    ) throw new ApiException(
      400,
      "VALIDATION",
      "비밀번호는 UTF-8 기준 72바이트 이하여야 해요."
    );
  }
}
