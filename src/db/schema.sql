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

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_by_display TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (
    (game_id IS NOT NULL AND recommendation_id IS NULL)
    OR (game_id IS NULL AND recommendation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_recommendations_guild ON recommendations(guild_id);
CREATE INDEX IF NOT EXISTS idx_games_guild ON games(guild_id);
CREATE INDEX IF NOT EXISTS idx_games_guild_status ON games(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_guild_game ON notes(guild_id, game_id);
CREATE INDEX IF NOT EXISTS idx_notes_guild_recommendation ON notes(guild_id, recommendation_id);
CREATE INDEX IF NOT EXISTS idx_notes_game_created ON notes(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notes_recommendation_created ON notes(recommendation_id, created_at);
