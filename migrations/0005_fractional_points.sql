-- Existing historical amounts are not rewritten; old rows retain zero fractional parts.
ALTER TABLE virtual_points ADD COLUMN balance_fraction INTEGER NOT NULL DEFAULT 0 CHECK(typeof(balance_fraction)='integer' AND balance_fraction BETWEEN 0 AND 99);
ALTER TABLE point_records ADD COLUMN delta_fraction INTEGER NOT NULL DEFAULT 0 CHECK(typeof(delta_fraction)='integer' AND delta_fraction BETWEEN -99 AND 99);
ALTER TABLE point_records ADD COLUMN before_fraction INTEGER NOT NULL DEFAULT 0 CHECK(typeof(before_fraction)='integer' AND before_fraction BETWEEN 0 AND 99);
ALTER TABLE point_records ADD COLUMN after_fraction INTEGER NOT NULL DEFAULT 0 CHECK(typeof(after_fraction)='integer' AND after_fraction BETWEEN 0 AND 99);
DROP TRIGGER point_record_integrity;
CREATE TRIGGER point_record_integrity BEFORE INSERT ON point_records BEGIN
 SELECT CASE WHEN typeof(NEW.delta)<>'integer' OR typeof(NEW.before_balance)<>'integer' OR typeof(NEW.after_balance)<>'integer' OR NEW.before_balance<0 OR NEW.after_balance<>NEW.before_balance+NEW.delta OR NEW.after_balance*100+NEW.after_fraction>9007199254740991 OR NEW.before_balance*100+NEW.before_fraction>9007199254740991 OR NEW.after_balance*100+NEW.after_fraction<>NEW.before_balance*100+NEW.before_fraction+NEW.delta*100+NEW.delta_fraction THEN RAISE(ABORT,'invalid fractional ledger arithmetic') END;
END;
DROP TRIGGER adjustment_ledger;
CREATE TRIGGER adjustment_ledger AFTER INSERT ON point_records WHEN NEW.game_record_id IS NULL AND NEW.type IN ('admin','recharge') BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM virtual_points WHERE user_id=NEW.user_id AND balance=NEW.before_balance AND balance_fraction=NEW.before_fraction) THEN RAISE(ABORT,'stale wallet') END;
 UPDATE virtual_points SET balance=NEW.after_balance,balance_fraction=NEW.after_fraction,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=NEW.user_id;
END;
DROP TRIGGER game_record_ledger;
CREATE TRIGGER game_record_ledger AFTER INSERT ON game_records BEGIN
 INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance,game_record_id,before_fraction,after_fraction)
 SELECT NEW.id,NEW.user_id,'game',NEW.reward-NEW.stake,balance,balance+NEW.reward-NEW.stake,NEW.id,balance_fraction,balance_fraction FROM virtual_points WHERE user_id=NEW.user_id;
 UPDATE virtual_points SET balance=balance+NEW.reward-NEW.stake,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=NEW.user_id;
 INSERT INTO leaderboard(user_id,score) VALUES(NEW.user_id,NEW.reward) ON CONFLICT(user_id) DO UPDATE SET score=score+NEW.reward,updated_at=CURRENT_TIMESTAMP;
END;
DROP TRIGGER game_record_numeric_guard;
CREATE TRIGGER game_record_numeric_guard BEFORE INSERT ON game_records BEGIN
 SELECT CASE WHEN typeof(NEW.stake)<>'integer' OR NEW.stake NOT IN (10,20,50,100) OR typeof(NEW.reward)<>'integer' OR NEW.reward<0 OR NEW.reward>100000000 THEN RAISE(ABORT,'invalid game amounts') END;
 SELECT CASE WHEN (SELECT (balance+NEW.reward-NEW.stake)*100+balance_fraction FROM virtual_points WHERE user_id=NEW.user_id)>9007199254740991 THEN RAISE(ABORT,'wallet integer limit') END;
END;
