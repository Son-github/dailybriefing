package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@Testcontainers
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PlatformIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
    "postgres:17-alpine"
  );

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper json;

  @Autowired
  org.springframework.jdbc.core.JdbcTemplate jdbc;

  @Autowired
  com.dailybriefing.calendar.CalendarEventRepository events;

  @Autowired
  org.springframework.transaction.PlatformTransactionManager transactionManager;

  String email() {
    return UUID.randomUUID() + "@example.com";
  }

  MvcResult signup(String email) throws Exception {
    return mvc
      .perform(
        post("/api/v1/auth/signup")
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of(
                "email",
                email,
                "password",
                "test-password-123",
                "nickname",
                "테스터"
              )
            )
          )
      )
      .andExpect(status().isCreated())
      .andReturn();
  }

  String token(MvcResult r) throws Exception {
    return json
      .readTree(r.getResponse().getContentAsString())
      .path("accessToken")
      .asText();
  }

  String cookie(MvcResult r) {
    return r
      .getResponse()
      .getHeader("Set-Cookie")
      .split(";")[0]
      .split("=", 2)[1];
  }

  String auth(String t) {
    return "Bearer " + t;
  }

  @Test
  void fullPersonalizedLifecycle() throws Exception {
    String email = email();
    var registration = signup(email);
    String t = token(registration);
    assertThat(registration.getResponse().getHeader("Set-Cookie")).contains(
      "HttpOnly",
      "SameSite=Lax",
      "Path=/api/v1/auth"
    );
    mvc
      .perform(get("/api/v1/users/me").header("Authorization", auth(t)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value(email));
    var d = mvc
      .perform(get("/api/v1/dashboard").header("Authorization", auth(t)))
      .andExpect(status().isOk())
      .andReturn();
    ObjectNode view = (ObjectNode) json.readTree(
      d.getResponse().getContentAsString()
    );
    var widgets = (com.fasterxml.jackson.databind.node.ArrayNode) view.get(
      "widgets"
    );
    // 실제 사용자 편집: 현재 기본 widgets에서 세 개만 고른 뒤 제거/재정렬/추가.
    widgets.removeAll();
    for (String type : List.of("weather", "exchange", "news"))
      widgets.add(
        json.valueToTree(
          Map.of(
            "id",
            UUID.randomUUID(),
            "type",
            type,
            "enabled",
            true,
            "order",
            widgets.size(),
            "size",
            "MEDIUM",
            "settings",
            Map.of()
          )
        )
      );
    widgets.remove(0);
    var first = widgets.remove(0);
    widgets.add(first);
    for (int i = 0; i < widgets.size(); i++) ((ObjectNode) widgets.get(i)).put(
      "order",
      i
    );
    widgets.add(
      json.valueToTree(
        Map.of(
          "id",
          UUID.randomUUID(),
          "type",
          "weather",
          "enabled",
          true,
          "order",
          2,
          "size",
          "MEDIUM",
          "settings",
          Map.of()
        )
      )
    );
    var updated = mvc
      .perform(
        put("/api/v1/dashboard")
          .with(csrf())
          .header("Authorization", auth(t))
          .contentType("application/json")
          .content(view.toString())
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.widgets[0].type").value("news"))
      .andExpect(jsonPath("$.widgets[2].type").value("weather"))
      .andReturn();
    assertThat(
      json
        .readTree(updated.getResponse().getContentAsString())
        .path("version")
        .asLong()
    ).isGreaterThan(view.path("version").asLong());
    mvc
      .perform(
        put("/api/v1/dashboard")
          .with(csrf())
          .header("Authorization", auth(t))
          .contentType("application/json")
          .content(view.toString())
      )
      .andExpect(status().isConflict());
    mvc
      .perform(get("/api/v1/dashboard").header("Authorization", auth(t)))
      .andExpect(jsonPath("$.widgets[0].type").value("news"));
    mvc
      .perform(
        put("/api/v1/users/me")
          .with(csrf())
          .header("Authorization", auth(t))
          .contentType("application/json")
          .content(
            "{\"nickname\":\"수정\",\"locationName\":\"부산\",\"latitude\":35.17,\"longitude\":129.07,\"theme\":\"DARK\",\"onboarded\":true,\"categories\":[\"technology\"],\"keywords\":[\"AI\"]}"
          )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.locationName").value("부산"));
    var login = mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of("email", email, "password", "test-password-123")
            )
          )
      )
      .andExpect(status().isOk())
      .andReturn();
    var refreshed = mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(login)))
      )
      .andExpect(status().isOk())
      .andReturn();
    assertThat(cookie(refreshed)).isNotEqualTo(cookie(login));
    mvc
      .perform(
        post("/api/v1/auth/logout")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(refreshed)))
      )
      .andExpect(status().isNoContent());
    mvc
      .perform(
        get("/api/v1/users/me").header("Authorization", auth(token(refreshed)))
      )
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(refreshed)))
      )
      .andExpect(status().isUnauthorized());
  }

  @Test
  void replayRevokesFamilyWithoutRollback() throws Exception {
    var r = signup(email());
    var rotated = mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(r)))
      )
      .andExpect(status().isOk())
      .andReturn();
    mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(r)))
      )
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        get("/api/v1/users/me").header("Authorization", auth(token(rotated)))
      )
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(rotated)))
      )
      .andExpect(status().isUnauthorized());
  }

  @Test
  void guestAccessValidationCsrfAndIsolation() throws Exception {
    mvc.perform(get("/api/v1/dashboard")).andExpect(status().isOk());
    mvc
      .perform(get("/api/v1/users/me"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.requestId").isNotEmpty());
    mvc
      .perform(
        post("/api/v1/auth/login").contentType("application/json").content("{}")
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(get("/api/v1/weather"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.meta.mode").value("DEMO"));
    mvc
      .perform(get("/api/v1/news"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items[0].title").isNotEmpty());
    mvc
      .perform(get("/api/v1/news/sections"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.it.items.length()").value(5))
      .andExpect(jsonPath("$.economy.items.length()").value(5))
      .andExpect(jsonPath("$.society.items.length()").value(5))
      .andExpect(jsonPath("$.world.items.length()").value(5))
      .andExpect(jsonPath("$.sports.items.length()").value(5))
      .andExpect(jsonPath("$.it.category").value("IT"))
      .andExpect(jsonPath("$.it.nextStart").value(6));
    mvc
      .perform(get("/api/v1/weather?latitude=999"))
      .andExpect(status().isBadRequest());
    mvc
      .perform(get("/api/v1/news?category=SPORTS&start=6&display=10"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items.length()").value(10))
      .andExpect(jsonPath("$.items[0].id").value("demo-SPORTS-5"))
      .andExpect(jsonPath("$.nextStart").value(16));
    for (var path : List.of(
      "/api/v1/news?category=ABC",
      "/api/v1/news?start=0",
      "/api/v1/news?start=1001",
      "/api/v1/news?display=101",
      "/api/v1/news?display=0"
    ))
      mvc.perform(get(path)).andExpect(status().isBadRequest());
    var a = signup(email());
    var b = signup(email());
    mvc
      .perform(
        get("/api/v1/me/mobility/favorites").header(
          "Authorization",
          auth(token(b))
        )
      )
      .andExpect(content().json("[]"));
  }

  @Test
  void passwordChangeRevokesSessionsAndDeleteCascades() throws Exception {
    var r = signup(email());
    String t = token(r);
    mvc
      .perform(
        put("/api/v1/users/me/password")
          .with(csrf())
          .header("Authorization", auth(t))
          .contentType("application/json")
          .content(
            "{\"currentPassword\":\"test-password-123\",\"newPassword\":\"changed-password-123\"}"
          )
      )
      .andExpect(status().isNoContent());
    mvc
      .perform(get("/api/v1/users/me").header("Authorization", auth(t)))
      .andExpect(status().isUnauthorized());
    String email = json
      .readTree(r.getResponse().getContentAsString())
      .path("user")
      .path("email")
      .asText();
    var login = mvc
      .perform(
        post("/api/v1/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of("email", email, "password", "changed-password-123")
            )
          )
      )
      .andExpect(status().isOk())
      .andReturn();
    mvc
      .perform(
        delete("/api/v1/users/me")
          .with(csrf())
          .header("Authorization", auth(token(login)))
          .contentType("application/json")
          .content("{\"password\":\"changed-password-123\"}")
      )
      .andExpect(status().isNoContent());
    mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(login)))
      )
      .andExpect(status().isUnauthorized());
  }

  String responseText(MvcResult result) throws Exception {
    return result.getResponse().getContentAsString();
  }

  String id(MvcResult result) throws Exception {
    return json.readTree(responseText(result)).path("id").asText();
  }

  String userId(MvcResult result) throws Exception {
    return json.readTree(responseText(result)).path("user").path("id").asText();
  }

  MvcResult personalPost(String path, String token, String data)
    throws Exception {
    return mvc
      .perform(
        post(path)
          .with(csrf())
          .header("Authorization", auth(token))
          .contentType("application/json")
          .content(data)
      )
      .andExpect(status().isCreated())
      .andReturn();
  }

  Map<String, Object> place(String id) {
    boolean from = id.equals("demo-seongbok");
    return Map.of(
      "id",
      id,
      "name",
      from ? "성복역" : "강남역",
      "address",
      "샘플 주소",
      "latitude",
      from ? 37.313 : 37.498,
      "longitude",
      from ? 127.080 : 127.028,
      "source",
      "SEARCH"
    );
  }

  String favoriteInput(String from, String to) throws Exception {
    return json.writeValueAsString(
      Map.of("routeName", "출근", "start", place(from), "end", place(to))
    );
  }

  String eventInput(String title, java.time.LocalDate date, String time)
    throws Exception {
    var out = new LinkedHashMap<String, Object>();
    out.put("title", title);
    out.put("eventDate", date.toString());
    out.put("eventTime", time);
    out.put("description", "개인 메모");
    out.put("location", "서울");
    return json.writeValueAsString(out);
  }

  @Test
  void mobilitySearchSupportsGpsSearchMapAndValidation() throws Exception {
    mvc
      .perform(get("/api/v1/mobility/places?query=성"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].name").value("성복역"));
    for (String source : List.of("GPS", "SEARCH", "MAP")) {
      var start = new HashMap<String, Object>(place("demo-seongbok"));
      start.put("source", source);
      start.remove("id");
      mvc
        .perform(
          post("/api/v1/mobility/routes")
            .with(csrf())
            .contentType("application/json")
            .content(
              json.writeValueAsString(
                Map.of("start", start, "end", place("demo-gangnam"))
              )
            )
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.routes.length()").value(1))
        .andExpect(jsonPath("$.routes[0].steps[0].type").value("WALK"))
        .andExpect(jsonPath("$.routes[0].departureTime").doesNotExist())
        .andExpect(jsonPath("$.routes[0].arrivalTime").doesNotExist());
    }
    mvc
      .perform(
        post("/api/v1/mobility/routes")
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              Map.of(
                "start",
                place("demo-gangnam"),
                "end",
                place("demo-gangnam")
              )
            )
          )
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(get("/api/v1/me/mobility/favorites"))
      .andExpect(status().isUnauthorized());
    mvc
      .perform(get("/api/v1/me/calendar/events/upcoming"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void favoritesPersistReorderAndAreOwned() throws Exception {
    var a = signup(email());
    var b = signup(email());
    String ta = token(a),
      tb = token(b);
    mvc
      .perform(
        post("/api/v1/me/mobility/favorites")
          .with(csrf())
          .header("Authorization", auth(ta))
          .contentType("application/json")
          .content(
            favoriteInput("demo-seongbok", "demo-gangnam").replace(
              "출근",
              "   "
            )
          )
      )
      .andExpect(status().isBadRequest());
    var first = personalPost(
      "/api/v1/me/mobility/favorites",
      ta,
      favoriteInput("demo-seongbok", "demo-gangnam")
    );
    var second = personalPost(
      "/api/v1/me/mobility/favorites",
      ta,
      favoriteInput("demo-gangnam", "demo-seongbok")
    );
    mvc
      .perform(
        post("/api/v1/me/mobility/favorites")
          .with(csrf())
          .header("Authorization", auth(ta))
          .contentType("application/json")
          .content(favoriteInput("demo-seongbok", "demo-gangnam"))
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        patch("/api/v1/me/mobility/favorites/" + id(second))
          .with(csrf())
          .header("Authorization", auth(ta))
          .contentType("application/json")
          .content("{\"routeName\":\"퇴근\",\"displayOrder\":0}")
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        get("/api/v1/me/mobility/favorites").header("Authorization", auth(ta))
      )
      .andExpect(jsonPath("$[0].routeName").value("퇴근"))
      .andExpect(jsonPath("$[1].displayOrder").value(1));
    for (String path : List.of(id(first), id(second))) {
      mvc
        .perform(
          patch("/api/v1/me/mobility/favorites/" + path)
            .with(csrf())
            .header("Authorization", auth(tb))
            .contentType("application/json")
            .content("{\"routeName\":\"침입\",\"displayOrder\":0}")
        )
        .andExpect(status().isNotFound());
      mvc
        .perform(
          delete("/api/v1/me/mobility/favorites/" + path)
            .with(csrf())
            .header("Authorization", auth(tb))
        )
        .andExpect(status().isNotFound());
    }
    mvc
      .perform(
        get("/api/v1/me/mobility/favorites").header("Authorization", auth(tb))
      )
      .andExpect(content().json("[]"));
    mvc
      .perform(
        delete("/api/v1/me/mobility/favorites/" + id(second))
          .with(csrf())
          .header("Authorization", auth(ta))
      )
      .andExpect(status().isNoContent());
    mvc
      .perform(
        get("/api/v1/me/mobility/favorites").header("Authorization", auth(ta))
      )
      .andExpect(jsonPath("$[0].displayOrder").value(0));
    assertThat(
      jdbc.queryForObject(
        "SELECT count(*) FROM favorite_routes WHERE user_id=?",
        Long.class,
        UUID.fromString(userId(a))
      )
    ).isEqualTo(1);
  }

  @Test
  void calendarCrudUpcomingLimitOrderAndOwnership() throws Exception {
    var a = signup(email());
    var b = signup(email());
    String ta = token(a),
      tb = token(b);
    var today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
    personalPost(
      "/api/v1/me/calendar/events",
      ta,
      eventInput("과거 일정", today.minusDays(1), null)
    );
    personalPost(
      "/api/v1/me/calendar/events",
      ta,
      eventInput("종일", today, null)
    );
    var timed = personalPost(
      "/api/v1/me/calendar/events",
      ta,
      eventInput("오전 약속", today, "09:00")
    );
    personalPost(
      "/api/v1/me/calendar/events",
      ta,
      eventInput("다음 날", today.plusDays(1), "11:00")
    );
    personalPost(
      "/api/v1/me/calendar/events",
      ta,
      eventInput("나중 약속", today.plusDays(5), null)
    );
    mvc
      .perform(
        get("/api/v1/me/calendar/events/upcoming").header(
          "Authorization",
          auth(ta)
        )
      )
      .andExpect(jsonPath("$.length()").value(3))
      .andExpect(jsonPath("$[0].title").value("오전 약속"))
      .andExpect(jsonPath("$[0].daysUntil").value(0))
      .andExpect(jsonPath("$[1].title").value("종일"))
      .andExpect(jsonPath("$[2].daysUntil").value(1));
    var range =
      "/api/v1/me/calendar/events?from=" +
      today.minusDays(1) +
      "&to=" +
      today.plusDays(10);
    mvc
      .perform(get(range).header("Authorization", auth(ta)))
      .andExpect(jsonPath("$.length()").value(5));
    mvc
      .perform(get(range).header("Authorization", auth(tb)))
      .andExpect(content().json("[]"));
    mvc
      .perform(
        patch("/api/v1/me/calendar/events/" + id(timed))
          .with(csrf())
          .header("Authorization", auth(tb))
          .contentType("application/json")
          .content(eventInput("침입", today, null))
      )
      .andExpect(status().isNotFound());
    mvc
      .perform(
        delete("/api/v1/me/calendar/events/" + id(timed))
          .with(csrf())
          .header("Authorization", auth(tb))
      )
      .andExpect(status().isNotFound());
    mvc
      .perform(
        patch("/api/v1/me/calendar/events/" + id(timed))
          .with(csrf())
          .header("Authorization", auth(ta))
          .contentType("application/json")
          .content(eventInput("수정된 약속", today.plusDays(2), "10:00"))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.daysUntil").value(2));
    mvc
      .perform(
        delete("/api/v1/me/calendar/events/" + id(timed))
          .with(csrf())
          .header("Authorization", auth(ta))
      )
      .andExpect(status().isNoContent());
    assertThat(
      jdbc.queryForObject(
        "SELECT count(*) FROM calendar_events WHERE user_id=?",
        Long.class,
        UUID.fromString(userId(a))
      )
    ).isEqualTo(4);
    mvc
      .perform(
        get("/api/v1/me/calendar/events?from=2026-01-01&to=2028-01-01").header(
          "Authorization",
          auth(ta)
        )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void bulkCleanupKeepsExactTwoYearBoundary() throws Exception {
    var a = signup(email());
    var uid = UUID.fromString(userId(a));
    for (String date : List.of(
      "2026-09-30",
      "2026-10-04",
      "2026-10-05",
      "2027-10-05",
      "2028-10-10"
    ))
      jdbc.update(
        "INSERT INTO calendar_events(id,user_id,title,event_date,created_at,updated_at) VALUES(?,?,?,?::date,now(),now())",
        UUID.randomUUID(),
        uid,
        "보관 경계 테스트",
        date
      );
    var fixed = java.time.Clock.fixed(
      java.time.Instant.parse("2028-10-04T18:00:00Z"),
      java.time.ZoneId.of("Asia/Seoul")
    );
    // 실제 Repository bulk SQL에 고정 Clock을 주입해 서울 03:00 경계값을 검증합니다.
    new org.springframework.transaction.support.TransactionTemplate(
      transactionManager
    ).execute(status ->
      new com.dailybriefing.calendar.CalendarCleanupService(
        events,
        fixed
      ).clean()
    );
    assertThat(
      jdbc.queryForList(
        "SELECT event_date::text FROM calendar_events WHERE user_id=? ORDER BY event_date",
        String.class,
        uid
      )
    ).containsExactly("2026-10-05", "2027-10-05", "2028-10-10");
  }

  @Test
  void deletingAccountErasesAllPersonalRowsAndAllowsFreshSignup()
    throws Exception {
    String address = email();
    var a = signup(address);
    var uid = UUID.fromString(userId(a));
    String t = token(a);
    var dashboardId = jdbc.queryForObject(
      "SELECT id FROM dashboards WHERE user_id=?",
      UUID.class,
      uid
    );
    personalPost(
      "/api/v1/me/mobility/favorites",
      t,
      favoriteInput("demo-seongbok", "demo-gangnam")
    );
    personalPost(
      "/api/v1/me/calendar/events",
      t,
      eventInput(
        "탈퇴시 삭제",
        java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).plusDays(1),
        null
      )
    );
    mvc
      .perform(
        delete("/api/v1/users/me")
          .with(csrf())
          .header("Authorization", auth(t))
          .contentType("application/json")
          .content("{\"password\":\"wrong-password\"}")
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(
        delete("/api/v1/users/me")
          .with(csrf())
          .header("Authorization", auth(t))
          .contentType("application/json")
          .content("{\"password\":\"test-password-123\"}")
      )
      .andExpect(status().isNoContent())
      .andExpect(
        header().string(
          "Set-Cookie",
          org.hamcrest.Matchers.containsString("Max-Age=0")
        )
      );
    for (String table : List.of(
      "user_preferences",
      "news_preferences",
      "dashboards",
      "refresh_sessions",
      "calendar_events",
      "favorite_routes"
    ))
      assertThat(
        jdbc.queryForObject(
          "SELECT count(*) FROM " + table + " WHERE user_id=?",
          Long.class,
          uid
        )
      )
        .as(table)
        .isZero();
    assertThat(
      jdbc.queryForObject(
        "SELECT count(*) FROM users WHERE id=?",
        Long.class,
        uid
      )
    ).isZero();
    assertThat(
      jdbc.queryForObject(
        "SELECT count(*) FROM dashboard_widgets WHERE dashboard_id=?",
        Long.class,
        dashboardId
      )
    ).isZero();
    mvc
      .perform(get("/api/v1/users/me").header("Authorization", auth(t)))
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/v1/auth/refresh")
          .with(csrf())
          .cookie(new Cookie("refresh_token", cookie(a)))
      )
      .andExpect(status().isUnauthorized());
    var fresh = signup(address);
    assertThat(userId(fresh)).isNotEqualTo(userId(a));
    mvc
      .perform(
        get("/api/v1/me/mobility/favorites").header(
          "Authorization",
          auth(token(fresh))
        )
      )
      .andExpect(content().json("[]"));
    mvc
      .perform(
        get("/api/v1/me/calendar/events/upcoming").header(
          "Authorization",
          auth(token(fresh))
        )
      )
      .andExpect(content().json("[]"));
    assertThat(
      jdbc.queryForObject(
        "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('watchlists','watchlist_items')",
        Long.class
      )
    ).isZero();
  }
}
