CREATE TABLE watchlists (
 id UUID PRIMARY KEY, user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE watchlist_items (
 id UUID PRIMARY KEY, watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
 symbol VARCHAR(20) NOT NULL, UNIQUE(watchlist_id,symbol)
);
