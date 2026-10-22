-- 이미 적용된 migration checksum을 유지하고 신규 migration으로 서비스 종료를 반영합니다.
UPDATE dashboard_widgets SET widget_type = 'transit' WHERE widget_type = 'stocks';
DROP TABLE watchlist_items;
DROP TABLE watchlists;
