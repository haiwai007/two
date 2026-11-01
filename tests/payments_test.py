"""Real SQLite transactional tests; chain events here are fixtures, never live payments."""
import sqlite3,pathlib,unittest,tempfile,concurrent.futures,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Payments(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=str(pathlib.Path(self.tmp.name)/'pay.sqlite');self.db=sqlite3.connect(self.path)
  for p in sorted((ROOT/'migrations').glob('*.sql')):self.db.executescript(p.read_text())
  self.db.executescript((ROOT/'seed.sql').read_text())
  for uid in ['u','owner','other']:
   self.db.execute('INSERT INTO users(id,username,email,password_hash) VALUES(?,?,?,?)',(uid,uid,uid+'@example.test','hash'))
   self.db.execute('INSERT INTO virtual_points(user_id,balance,balance_fraction) VALUES(?,1,80)',(uid,))
  self.db.execute("INSERT INTO admin_users(user_id,role) VALUES('owner','owner')")
  self.db.execute("INSERT INTO game_assets(id,storage_key,media_type,size,original_name) VALUES('qr','local-test','image/png',10,'fixture.png')")
  self.db.execute("UPDATE system_settings SET value=? WHERE key='payment_usdt_trc20'",(json.dumps({'enabled':True,'autoApproval':True}),));self.db.commit()
 def tearDown(self):self.db.close();self.tmp.cleanup()
 def order(self,oid='o',quote=10370000,uid='u',address='address',hex='recipient'):
  self.db.execute('INSERT INTO recharge_orders(id,user_id,request_key,base_usdt,quote_micro,credit_minor,address,address_hex,qr_asset_id,created_ms,expires_ms) VALUES(?,?,?,10,?,?,?, ?,\'qr\',1000,2000)',(oid,uid,oid,quote,quote//10000,address,hex));self.db.commit()
 def proof(self,tx='tx',index=0,amount='10370000',recipient='recipient',time=1500):
  self.db.execute('INSERT INTO chain_transfers VALUES(?,?,?,?,?,100,?,1)',(tx,index,recipient,'sender',amount,time));self.db.commit()
 def approve(self,oid='o',tx='tx',index=0,mode='auto',actor=None):
  self.db.execute("UPDATE recharge_orders SET status='approved',event_tx=?,event_index=?,approval_mode=?,approved_by=? WHERE id=?",(tx,index,mode,actor,oid));self.db.commit()
 def balance(self):return self.db.execute("SELECT balance,balance_fraction FROM virtual_points WHERE user_id='u'").fetchone()
 def test_fraction_carry_atomic_credit(self):
  self.order();self.proof();self.approve();self.assertEqual(self.balance(),(12,17))
  self.assertEqual(self.db.execute("SELECT delta,delta_fraction,before_fraction,after_fraction FROM point_records WHERE user_id='u'").fetchone(),(11,-63,80,17))
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM audit_logs WHERE action='recharge.approved'").fetchone()[0],1)
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM messages WHERE id='recharge-o'").fetchone()[0],1)
 def test_duplicate_settlement_and_proof_reuse(self):
  self.order();self.proof();self.approve()
  with self.assertRaises(sqlite3.IntegrityError):self.approve()
  self.order('second',uid='other',address='another')
  with self.assertRaises(sqlite3.IntegrityError):self.approve('second')
  self.assertEqual(self.balance(),(12,17));self.assertEqual(self.db.execute('SELECT COUNT(*) FROM point_records').fetchone()[0],1)
 def test_wrong_receiver_amount_old_payment_or_missing_proof(self):
  self.order()
  with self.assertRaises(sqlite3.IntegrityError):self.approve()
  for i,kwargs in enumerate([{'recipient':'wrong'},{'amount':'10370001'},{'time':999}]):
   self.proof(tx=str(i),**kwargs)
   with self.assertRaises(sqlite3.IntegrityError):self.approve(tx=str(i))
  self.assertEqual(self.balance(),(1,80))
 def test_late_payment_manual_only(self):
  self.order();self.proof(time=2001)
  with self.assertRaises(sqlite3.IntegrityError):self.approve()
  self.approve(mode='manual',actor='owner');self.assertEqual(self.balance(),(12,17))
 def test_timely_proof_after_expiry_can_auto_settle(self):
  self.order();self.db.execute("UPDATE recharge_orders SET status='expired'");self.proof();self.approve();self.assertEqual(self.balance(),(12,17))
 def test_cancelled_requires_manual_owner(self):
  self.order();self.db.execute("UPDATE recharge_orders SET status='cancelled'");self.proof()
  with self.assertRaises(sqlite3.IntegrityError):self.approve()
  with self.assertRaises(sqlite3.IntegrityError):self.approve(mode='manual',actor='other')
  self.approve(mode='manual',actor='owner')
 def test_disabled_auto_and_null_authority_cannot_credit(self):
  self.order();self.proof();self.db.execute("UPDATE system_settings SET value='{}' WHERE key='payment_usdt_trc20'");self.db.commit()
  for mode in ['auto',None,'invalid']:
   with self.assertRaises(sqlite3.IntegrityError):self.approve(mode=mode)
  self.assertEqual(self.balance(),(1,80))
 def test_blocked_wallet_rolls_back_every_effect(self):
  self.order();self.proof();self.db.execute("UPDATE users SET status='blocked' WHERE id='u'");self.db.commit()
  with self.assertRaises(sqlite3.IntegrityError):self.approve()
  self.assertEqual(self.db.execute("SELECT status FROM recharge_orders").fetchone()[0],'pending');self.assertEqual(self.balance(),(1,80));self.assertEqual(self.db.execute('SELECT COUNT(*) FROM point_records').fetchone()[0],0)
 def test_permanent_quote_reservation(self):
  self.order();self.db.execute("UPDATE recharge_orders SET status='cancelled'");self.db.commit()
  with self.assertRaises(sqlite3.IntegrityError):self.order('reuse')
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute('DELETE FROM recharge_orders')
 def test_immutable_facts_proofs_and_rejected_orders(self):
  self.order();self.proof()
  for sql in ['UPDATE recharge_orders SET quote_micro=10400000,credit_minor=1040','UPDATE chain_transfers SET amount_micro=\'1\'','DELETE FROM chain_transfers']:
   with self.assertRaises(sqlite3.IntegrityError):self.db.execute(sql)
  self.db.execute("UPDATE recharge_orders SET status='rejected'");self.db.commit()
  with self.assertRaises(sqlite3.IntegrityError):self.approve(mode='manual',actor='owner')
 def test_fraction_admin_deduction_and_stale_fraction(self):
  self.db.execute("INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance,delta_fraction,before_fraction,after_fraction) VALUES('a','u','admin',-1,1,0,-17,80,63)");self.db.commit();self.assertEqual(self.balance(),(0,63))
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance,delta_fraction,before_fraction,after_fraction) VALUES('b','u','admin',0,0,0,1,60,61)")
 def test_game_preserves_fraction(self):
  self.db.execute("UPDATE virtual_points SET balance=100 WHERE user_id='u'")
  self.db.execute("INSERT INTO game_records(id,user_id,game_id,request_key,stake,reward,result) VALUES('game','u','golden-god','game',10,20,'{}')");self.db.commit();self.assertEqual(self.balance(),(110,80))
 def test_competing_manual_and_auto_only_once(self):
  self.order();self.proof()
  def settle(i):
   conn=sqlite3.connect(self.path,timeout=10)
   try:
    cur=conn.execute("UPDATE recharge_orders SET status='approved',event_tx='tx',event_index=0,approval_mode=?,approved_by=? WHERE id='o' AND status='pending'",('manual' if i%2 else 'auto','owner' if i%2 else None));conn.commit();return cur.rowcount
   finally:conn.close()
  with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:self.assertEqual(sum(pool.map(settle,range(12))),1)
  self.assertEqual(self.balance(),(12,17));self.assertEqual(self.db.execute('SELECT COUNT(*) FROM point_records').fetchone()[0],1)
 def test_upgrade_keeps_old_whole_points_history(self):
  db=sqlite3.connect(':memory:')
  for p in sorted((ROOT/'migrations').glob('*.sql'))[:4]:db.executescript(p.read_text())
  db.execute("INSERT INTO users(id,username,email,password_hash) VALUES('legacy','legacy','legacy@example.test','hash')")
  db.execute("INSERT INTO virtual_points(user_id,balance) VALUES('legacy',100)")
  db.execute("INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance) VALUES('legacy','legacy','admin',7,100,107)");db.commit()
  db.executescript((ROOT/'migrations/0005_fractional_points.sql').read_text());db.executescript((ROOT/'migrations/0006_chain_recharge.sql').read_text())
  self.assertEqual(db.execute('SELECT balance,balance_fraction FROM virtual_points').fetchone(),(107,0));self.assertEqual(db.execute('SELECT delta,before_balance,after_balance,delta_fraction FROM point_records').fetchone(),(7,100,107,0));db.close()
if __name__=='__main__':unittest.main(verbosity=2)
