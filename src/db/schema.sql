CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  link TEXT,
  recommended_by_user_id TEXT NOT NULL,
  recommended_by_display TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (guild_id, name_normalized)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  status TEXT NOT NULL,
  link TEXT,
  recommendation_id INTEGER REFERENCES recommendations(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  UNIQUE (guild_id, name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_guild ON recommendations(guild_id);
CREATE INDEX IF NOT EXISTS idx_games_guild ON games(guild_id);
CREATE INDEX IF NOT EXISTS idx_games_guild_status ON games(guild_id, status);
