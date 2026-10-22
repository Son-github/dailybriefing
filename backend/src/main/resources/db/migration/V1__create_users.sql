CREATE TABLE users (
 id UUID PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL, nickname VARCHAR(40) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE user_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 location_name VARCHAR(80) NOT NULL DEFAULT '서울', latitude DOUBLE PRECISION NOT NULL DEFAULT 37.5665,
 longitude DOUBLE PRECISION NOT NULL DEFAULT 126.978, theme VARCHAR(10) NOT NULL DEFAULT 'SYSTEM',
 onboarded BOOLEAN NOT NULL DEFAULT false,
 CHECK(latitude BETWEEN -90 AND 90), CHECK(longitude BETWEEN -180 AND 180),
 CHECK(theme IN ('LIGHT','DARK','SYSTEM'))
);
CREATE TABLE news_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 categories JSONB NOT NULL DEFAULT '["all"]', keywords JSONB NOT NULL DEFAULT '[]'
);
CREATE TABLE refresh_sessions (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash VARCHAR(64) NOT NULL UNIQUE, family_id UUID NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, revoked BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX refresh_sessions_family ON refresh_sessions(family_id);
CREATE INDEX refresh_sessions_user ON refresh_sessions(user_id);
