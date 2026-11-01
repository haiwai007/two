PRAGMA foreign_keys=ON;
CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, email TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL, avatar TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE admin_users (user_id TEXT PRIMARY KEY REFERENCES users(id), role TEXT NOT NULL CHECK(role IN ('owner','editor','support')));
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE game_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, icon TEXT, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE game_assets (id TEXT PRIMARY KEY, storage_key TEXT NOT NULL UNIQUE, media_type TEXT NOT NULL, size INTEGER NOT NULL, original_name TEXT NOT NULL, game_id TEXT, version INTEGER NOT NULL DEFAULT 1, predecessor_id TEXT REFERENCES game_assets(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE games (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL, category_id TEXT REFERENCES game_categories(id), cover_asset_id TEXT REFERENCES game_assets(id), banner_asset_id TEXT REFERENCES game_assets(id), status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','published','offline')), version TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0, hot INTEGER NOT NULL DEFAULT 0, program_path TEXT NOT NULL, config TEXT NOT NULL DEFAULT '{}', rules TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE game_integrations (id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id), version TEXT NOT NULL, status TEXT NOT NULL, program_path TEXT NOT NULL, rules TEXT NOT NULL, pending_rules TEXT NOT NULL DEFAULT '原版授权规则待提供', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(game_id,version));
CREATE TABLE virtual_points (user_id TEXT PRIMARY KEY REFERENCES users(id), balance INTEGER NOT NULL DEFAULT 10000 CHECK(balance>=0), revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE game_records (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), game_id TEXT NOT NULL REFERENCES games(id), request_key TEXT NOT NULL, stake INTEGER NOT NULL CHECK(stake>0), reward INTEGER NOT NULL CHECK(reward>=0), result TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,request_key));
CREATE INDEX game_records_user_time ON game_records(user_id,created_at DESC);
CREATE TABLE point_records (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, delta INTEGER NOT NULL, before_balance INTEGER NOT NULL, after_balance INTEGER NOT NULL CHECK(after_balance>=0), game_record_id TEXT REFERENCES game_records(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX point_records_user_time ON point_records(user_id,created_at DESC);
CREATE TABLE favorites (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, game_id TEXT REFERENCES games(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,game_id));
CREATE TABLE events (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, asset_id TEXT REFERENCES game_assets(id), starts_at TEXT, ends_at TEXT, status TEXT NOT NULL DEFAULT 'draft');
CREATE TABLE announcements (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE messages (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), title TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE leaderboard (user_id TEXT PRIMARY KEY REFERENCES users(id), score INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE system_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE audit_logs (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX audit_logs_time ON audit_logs(created_at DESC);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
-- Atomic ledger guards: each inserted round checks and updates wallet in the same transaction.
CREATE TRIGGER game_record_guard BEFORE INSERT ON game_records BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND status='active') THEN RAISE(ABORT,'inactive user') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND status='published') THEN RAISE(ABORT,'game unavailable') END;
 SELECT CASE WHEN COALESCE((SELECT balance FROM virtual_points WHERE user_id=NEW.user_id),-1)<NEW.stake THEN RAISE(ABORT,'insufficient points') END;
END;
CREATE TRIGGER game_record_ledger AFTER INSERT ON game_records BEGIN
 INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance,game_record_id) SELECT NEW.id,NEW.user_id,'game',NEW.reward-NEW.stake,balance,balance+NEW.reward-NEW.stake,NEW.id FROM virtual_points WHERE user_id=NEW.user_id;
 UPDATE virtual_points SET balance=balance+NEW.reward-NEW.stake,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=NEW.user_id;
 INSERT INTO leaderboard(user_id,score) VALUES(NEW.user_id,NEW.reward) ON CONFLICT(user_id) DO UPDATE SET score=score+NEW.reward,updated_at=CURRENT_TIMESTAMP;
END;
CREATE TRIGGER adjustment_ledger AFTER INSERT ON point_records WHEN NEW.game_record_id IS NULL AND NEW.type='admin' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM virtual_points WHERE user_id=NEW.user_id AND balance=NEW.before_balance) THEN RAISE(ABORT,'stale wallet') END;
 UPDATE virtual_points SET balance=NEW.after_balance,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=NEW.user_id;
END;
