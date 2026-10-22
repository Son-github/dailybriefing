CREATE TABLE favorite_routes (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 departure_station_id VARCHAR(80) NOT NULL, departure_station_name VARCHAR(80) NOT NULL,
 arrival_station_id VARCHAR(80) NOT NULL, arrival_station_name VARCHAR(80) NOT NULL,
 nickname VARCHAR(40), display_order INTEGER NOT NULL CHECK(display_order >= 0),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
 UNIQUE(user_id, departure_station_id, arrival_station_id),
 CHECK(departure_station_id <> arrival_station_id)
);
CREATE INDEX favorite_routes_user_order ON favorite_routes(user_id, display_order);
CREATE TABLE calendar_events (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title VARCHAR(120) NOT NULL, event_date DATE NOT NULL, event_time TIME,
 description VARCHAR(2000), location VARCHAR(200),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX calendar_events_user_date ON calendar_events(user_id, event_date, event_time);
-- 사용자별 조회 index는 전역 cleanup에 적합하지 않아 날짜 단독 index를 둡니다.
CREATE INDEX calendar_events_cleanup_date ON calendar_events(event_date);
