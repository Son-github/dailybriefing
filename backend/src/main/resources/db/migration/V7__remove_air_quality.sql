-- 적용된 과거 migration은 변경하지 않습니다. 기존 사용자의 나머지 widget 순서는 보존합니다.
DELETE FROM dashboard_widgets WHERE widget_type = 'air-quality';
WITH positions AS (SELECT id, row_number() OVER (PARTITION BY dashboard_id ORDER BY position) - 1 AS position FROM dashboard_widgets) UPDATE dashboard_widgets w SET position=p.position FROM positions p WHERE w.id=p.id;
