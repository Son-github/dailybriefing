CREATE TABLE dashboard_widgets (
 id UUID PRIMARY KEY, dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
 widget_type VARCHAR(40) NOT NULL, enabled BOOLEAN NOT NULL DEFAULT true,
 position INTEGER NOT NULL CHECK(position >= 0), size VARCHAR(10) NOT NULL CHECK(size IN ('SMALL','MEDIUM','LARGE')),
 settings JSONB NOT NULL DEFAULT '{}',
 UNIQUE(dashboard_id,widget_type), UNIQUE(dashboard_id,position)
);
