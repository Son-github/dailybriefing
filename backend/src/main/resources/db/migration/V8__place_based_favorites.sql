-- 기존 역 이름/별명은 보존합니다. 확인되지 않은 좌표는 생성하지 않으며 UI에서 재선택을 안내합니다.
DO $$ DECLARE constraint_name text; BEGIN
 FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid='favorite_routes'::regclass AND contype IN ('u','c') AND pg_get_constraintdef(oid) LIKE '%departure_station_id%'
 LOOP EXECUTE format('ALTER TABLE favorite_routes DROP CONSTRAINT %I',constraint_name); END LOOP;
END $$;
ALTER TABLE favorite_routes RENAME COLUMN departure_station_id TO start_place_id;
ALTER TABLE favorite_routes RENAME COLUMN arrival_station_id TO end_place_id;
ALTER TABLE favorite_routes RENAME COLUMN departure_station_name TO start_place_name;
ALTER TABLE favorite_routes RENAME COLUMN arrival_station_name TO end_place_name;
ALTER TABLE favorite_routes RENAME COLUMN nickname TO route_name;
ALTER TABLE favorite_routes ALTER COLUMN start_place_id DROP NOT NULL;
ALTER TABLE favorite_routes ALTER COLUMN end_place_id DROP NOT NULL;
ALTER TABLE favorite_routes ALTER COLUMN start_place_name TYPE VARCHAR(200);
ALTER TABLE favorite_routes ALTER COLUMN end_place_name TYPE VARCHAR(200);
UPDATE favorite_routes SET route_name=left(coalesce(nullif(trim(route_name),''),start_place_name || ' → ' || end_place_name),30),start_place_id=NULL,end_place_id=NULL;
ALTER TABLE favorite_routes ALTER COLUMN route_name TYPE VARCHAR(30);
ALTER TABLE favorite_routes ALTER COLUMN route_name SET NOT NULL;
ALTER TABLE favorite_routes ADD CONSTRAINT favorite_name_valid CHECK(length(trim(route_name)) > 0);
ALTER TABLE favorite_routes ADD COLUMN start_address VARCHAR(300) NOT NULL DEFAULT '';
ALTER TABLE favorite_routes ADD COLUMN end_address VARCHAR(300) NOT NULL DEFAULT '';
ALTER TABLE favorite_routes ADD COLUMN start_latitude DOUBLE PRECISION;
ALTER TABLE favorite_routes ADD COLUMN start_longitude DOUBLE PRECISION;
ALTER TABLE favorite_routes ADD COLUMN end_latitude DOUBLE PRECISION;
ALTER TABLE favorite_routes ADD COLUMN end_longitude DOUBLE PRECISION;
ALTER TABLE favorite_routes ADD CONSTRAINT favorite_coordinates_valid CHECK (
 (start_latitude IS NULL AND start_longitude IS NULL AND end_latitude IS NULL AND end_longitude IS NULL) OR
 (start_latitude IS NOT NULL AND start_longitude IS NOT NULL AND end_latitude IS NOT NULL AND end_longitude IS NOT NULL AND
 start_latitude BETWEEN -90 AND 90 AND end_latitude BETWEEN -90 AND 90 AND start_longitude BETWEEN -180 AND 180 AND end_longitude BETWEEN -180 AND 180));
CREATE UNIQUE INDEX favorite_place_pair_unique ON favorite_routes(user_id,start_latitude,start_longitude,end_latitude,end_longitude) WHERE start_latitude IS NOT NULL;
