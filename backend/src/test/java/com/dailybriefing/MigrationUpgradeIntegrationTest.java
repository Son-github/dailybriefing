package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@Testcontainers
@Tag("integration")
class MigrationUpgradeIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
    "postgres:17-alpine"
  );

  @Test
  void existingStationFavoritesKeepNamesAndRequireCoordinateReselection()
    throws Exception {
    Flyway.configure()
      .dataSource(
        postgres.getJdbcUrl(),
        postgres.getUsername(),
        postgres.getPassword()
      )
      .target("6")
      .load()
      .migrate();
    UUID uid = UUID.randomUUID(),
      favorite = UUID.randomUUID(),
      dashboard = UUID.randomUUID();
    try (
      var db = DriverManager.getConnection(
        postgres.getJdbcUrl(),
        postgres.getUsername(),
        postgres.getPassword()
      )
    ) {
      try (
        var q = db.prepareStatement(
          "INSERT INTO users(id,email,password_hash,nickname) VALUES(?,?,?,?)"
        )
      ) {
        q.setObject(1, uid);
        q.setString(2, "migration@example.com");
        q.setString(3, "hashed-test-only");
        q.setString(4, "사용자");
        q.executeUpdate();
      }
      try (
        var q = db.prepareStatement(
          "INSERT INTO favorite_routes(id,user_id,departure_station_id,departure_station_name,arrival_station_id,arrival_station_name,nickname,display_order,created_at,updated_at) VALUES(?,?,'a','성복','b','강남','출근',0,now(),now())"
        )
      ) {
        q.setObject(1, favorite);
        q.setObject(2, uid);
        q.executeUpdate();
      }
      try (
        var q = db.prepareStatement(
          "INSERT INTO dashboards(id,user_id) VALUES(?,?)"
        )
      ) {
        q.setObject(1, dashboard);
        q.setObject(2, uid);
        q.executeUpdate();
      }
      try (
        var q = db.prepareStatement(
          "INSERT INTO dashboard_widgets(id,dashboard_id,widget_type,enabled,position,size,settings) VALUES(?,?,'air-quality',true,0,'MEDIUM','{}')"
        )
      ) {
        q.setObject(1, UUID.randomUUID());
        q.setObject(2, dashboard);
        q.executeUpdate();
      }
      Flyway.configure()
        .dataSource(
          postgres.getJdbcUrl(),
          postgres.getUsername(),
          postgres.getPassword()
        )
        .load()
        .migrate();
      try (
        var q = db.prepareStatement(
          "SELECT route_name,start_place_name,end_place_name,start_latitude FROM favorite_routes WHERE id=?"
        )
      ) {
        q.setObject(1, favorite);
        try (var row = q.executeQuery()) {
          assertThat(row.next()).isTrue();
          assertThat(row.getString(1)).isEqualTo("출근");
          assertThat(row.getString(2)).isEqualTo("성복");
          assertThat(row.getString(3)).isEqualTo("강남");
          assertThat(row.getObject(4)).isNull();
        }
      }
      try (
        var q = db.createStatement();
        var rows = q.executeQuery("SELECT count(*) FROM dashboard_widgets")
      ) {
        rows.next();
        assertThat(rows.getInt(1)).isZero();
      }
    }
  }
}
