CREATE TRIGGER point_record_integrity BEFORE INSERT ON point_records BEGIN
 SELECT CASE WHEN typeof(NEW.delta)<>'integer' OR typeof(NEW.before_balance)<>'integer' OR typeof(NEW.after_balance)<>'integer' OR NEW.before_balance<0 OR NEW.after_balance<>NEW.before_balance+NEW.delta OR NEW.after_balance>9007199254740991 THEN RAISE(ABORT,'invalid point ledger arithmetic') END;
END;
CREATE TRIGGER point_record_no_update BEFORE UPDATE ON point_records BEGIN SELECT RAISE(ABORT,'point ledger is immutable'); END;
CREATE TRIGGER point_record_no_delete BEFORE DELETE ON point_records BEGIN SELECT RAISE(ABORT,'point ledger is immutable'); END;
CREATE TRIGGER game_record_no_update BEFORE UPDATE ON game_records BEGIN SELECT RAISE(ABORT,'game records are immutable'); END;
CREATE TRIGGER game_record_no_delete BEFORE DELETE ON game_records BEGIN SELECT RAISE(ABORT,'game records are immutable'); END;
CREATE TRIGGER game_record_numeric_guard BEFORE INSERT ON game_records BEGIN
 SELECT CASE WHEN typeof(NEW.stake)<>'integer' OR NEW.stake NOT IN (10,20,50,100) OR typeof(NEW.reward)<>'integer' OR NEW.reward<0 OR NEW.reward>100000000 THEN RAISE(ABORT,'invalid game amounts') END;
 SELECT CASE WHEN (SELECT balance+NEW.reward-NEW.stake FROM virtual_points WHERE user_id=NEW.user_id)>9007199254740991 THEN RAISE(ABORT,'wallet integer limit') END;
END;
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS games_category_sort ON games(category_id,status,sort);
CREATE INDEX IF NOT EXISTS game_records_time ON game_records(created_at);
