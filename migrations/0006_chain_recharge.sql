CREATE TABLE recharge_orders (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,
 base_usdt INTEGER NOT NULL CHECK(base_usdt BETWEEN 1 AND 1000000),
 quote_micro INTEGER NOT NULL CHECK(typeof(quote_micro)='integer' AND quote_micro BETWEEN base_usdt*1000000 AND base_usdt*1000000+990000 AND quote_micro%10000=0),
 credit_minor INTEGER NOT NULL CHECK(typeof(credit_minor)='integer' AND credit_minor*10000=quote_micro),
 address TEXT NOT NULL,address_hex TEXT NOT NULL,qr_asset_id TEXT NOT NULL REFERENCES game_assets(id),
 created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL CHECK(expires_ms>created_ms),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','expired','cancelled','manual_review','approved','rejected')),
 claimed_tx TEXT,review_note TEXT NOT NULL DEFAULT '',approval_mode TEXT,approved_by TEXT REFERENCES users(id),reviewed_ms INTEGER,
 event_tx TEXT,event_index INTEGER,
 UNIQUE(user_id,request_key),UNIQUE(address,quote_micro),UNIQUE(event_tx,event_index)
);
CREATE INDEX recharge_pending_time ON recharge_orders(status,created_ms);
CREATE INDEX recharge_user_time ON recharge_orders(user_id,created_ms);
CREATE TABLE chain_transfers (
 tx_id TEXT NOT NULL,log_index INTEGER NOT NULL,recipient_hex TEXT NOT NULL,sender_hex TEXT NOT NULL,
 amount_micro TEXT NOT NULL,block_number INTEGER NOT NULL,block_ms INTEGER NOT NULL,verified INTEGER NOT NULL CHECK(verified=1),
 PRIMARY KEY(tx_id,log_index)
);
CREATE TABLE chain_checked_transactions (tx_id TEXT PRIMARY KEY,checked_ms INTEGER NOT NULL);
CREATE TABLE payment_monitor_state (name TEXT PRIMARY KEY,lease_id TEXT,lease_until INTEGER NOT NULL DEFAULT 0,next_poll_ms INTEGER NOT NULL DEFAULT 0,last_scan_ms INTEGER,last_error TEXT,scanned INTEGER NOT NULL DEFAULT 0);
INSERT INTO payment_monitor_state(name) VALUES('trc20');
CREATE TABLE payment_scan_cursors(address TEXT PRIMARY KEY,fingerprint TEXT NOT NULL DEFAULT '',since_ms INTEGER NOT NULL DEFAULT 0,scanned_ms INTEGER NOT NULL DEFAULT 0);
CREATE TRIGGER recharge_insert_pending BEFORE INSERT ON recharge_orders WHEN NEW.status<>'pending' OR NEW.event_tx IS NOT NULL OR NEW.event_index IS NOT NULL BEGIN SELECT RAISE(ABORT,'new recharge must be pending and uncredited'); END;
CREATE TRIGGER recharge_facts_immutable BEFORE UPDATE ON recharge_orders BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.user_id<>OLD.user_id OR NEW.request_key<>OLD.request_key OR NEW.base_usdt<>OLD.base_usdt OR NEW.quote_micro<>OLD.quote_micro OR NEW.credit_minor<>OLD.credit_minor OR NEW.address<>OLD.address OR NEW.address_hex<>OLD.address_hex OR NEW.qr_asset_id<>OLD.qr_asset_id OR NEW.created_ms<>OLD.created_ms OR NEW.expires_ms<>OLD.expires_ms THEN RAISE(ABORT,'immutable recharge facts') END;
 SELECT CASE WHEN OLD.status IN ('approved','rejected') THEN RAISE(ABORT,'settled recharge is immutable') END;
 SELECT CASE WHEN NEW.status='approved' AND NOT EXISTS(SELECT 1 FROM chain_transfers e WHERE e.tx_id=NEW.event_tx AND e.log_index=NEW.event_index AND e.verified=1 AND e.recipient_hex=NEW.address_hex AND e.amount_micro=CAST(NEW.quote_micro AS TEXT) AND e.block_ms>=NEW.created_ms) THEN RAISE(ABORT,'verified matching payment required') END;
 SELECT CASE WHEN NEW.status='approved' AND NEW.approval_mode='auto' AND (OLD.status NOT IN ('pending','expired') OR NOT EXISTS(SELECT 1 FROM chain_transfers WHERE tx_id=NEW.event_tx AND log_index=NEW.event_index AND block_ms<=NEW.expires_ms) OR NOT EXISTS(SELECT 1 FROM system_settings WHERE key='payment_usdt_trc20' AND json_extract(value,'$.enabled')=1 AND json_extract(value,'$.autoApproval')=1)) THEN RAISE(ABORT,'automatic payment conditions not met') END;
 SELECT CASE WHEN NEW.status='approved' AND (COALESCE(NEW.approval_mode,'') NOT IN ('auto','manual') OR (NEW.approval_mode='manual' AND NOT EXISTS(SELECT 1 FROM admin_users a JOIN users u ON u.id=a.user_id WHERE a.user_id=NEW.approved_by AND a.role='owner' AND u.status='active'))) THEN RAISE(ABORT,'invalid approval authority') END;
END;
CREATE TRIGGER recharge_order_no_delete BEFORE DELETE ON recharge_orders BEGIN SELECT RAISE(ABORT,'recharge history cannot be deleted or quoted amounts reused'); END;
CREATE TRIGGER chain_transfer_no_update BEFORE UPDATE ON chain_transfers BEGIN SELECT RAISE(ABORT,'chain proof is immutable'); END;
CREATE TRIGGER chain_transfer_no_delete BEFORE DELETE ON chain_transfers BEGIN SELECT RAISE(ABORT,'chain proof is immutable'); END;
CREATE TRIGGER recharge_credit AFTER UPDATE OF status ON recharge_orders WHEN NEW.status='approved' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM virtual_points p JOIN users u ON u.id=p.user_id WHERE p.user_id=NEW.user_id AND u.status='active') THEN RAISE(ABORT,'active wallet required') END;
 INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance,delta_fraction,before_fraction,after_fraction)
 SELECT 'recharge-'||NEW.id,NEW.user_id,'recharge',(balance*100+balance_fraction+NEW.credit_minor)/100-balance,balance,(balance*100+balance_fraction+NEW.credit_minor)/100,(balance*100+balance_fraction+NEW.credit_minor)%100-balance_fraction,balance_fraction,(balance*100+balance_fraction+NEW.credit_minor)%100 FROM virtual_points WHERE user_id=NEW.user_id;
 INSERT INTO audit_logs(id,actor_id,action,target,detail) VALUES('recharge-'||NEW.id,NEW.approved_by,'recharge.approved',NEW.id,json_object('credit_minor',NEW.credit_minor,'tx_id',NEW.event_tx,'log_index',NEW.event_index,'mode',NEW.approval_mode));
 INSERT INTO messages(id,user_id,title,content) VALUES('recharge-'||NEW.id,NEW.user_id,'充值已到账','充值已核实，增加'||printf('%.2f',NEW.credit_minor/100.0)||'分。');
END;
