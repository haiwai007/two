import sqlite3,pathlib,unittest,tempfile,concurrent.futures,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
class DatabaseTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=str(pathlib.Path(self.tmp.name)/'db.sqlite');self.db=sqlite3.connect(self.path);[self.db.executescript(p.read_text()) for p in sorted((ROOT/'migrations').glob('*.sql'))];self.db.executescript((ROOT/'seed.sql').read_text());self.db.executescript((ROOT/'scripts/catalog-v02.sql').read_text());self.db.execute("INSERT INTO users(id,username,email,password_hash) VALUES('u','tester','test@example.com','hash')");self.db.execute("INSERT INTO virtual_points(user_id,balance) VALUES('u',100)");self.db.commit()
 def tearDown(self):self.db.close();self.tmp.cleanup()
 def round(self,key='r',stake=10,reward=20):
  self.db.execute('INSERT INTO game_records(id,user_id,game_id,request_key,stake,reward,result) VALUES(?,?,?,?,?,?,?)',(key,'u','golden-god',key,stake,reward,'{}'));self.db.commit()
 def test_catalog(self):
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM games').fetchone()[0],30);self.assertEqual(self.db.execute("SELECT COUNT(*) FROM games WHERE status='published'").fetchone()[0],30)
 def test_atomic_ledger(self):
  self.round();self.assertEqual(self.db.execute('SELECT balance FROM virtual_points').fetchone()[0],110);self.assertEqual(self.db.execute('SELECT delta,before_balance,after_balance FROM point_records').fetchone(),(10,100,110))
 def test_duplicate(self):
  self.round()
  with self.assertRaises(sqlite3.IntegrityError):self.round()
  self.assertEqual(self.db.execute('SELECT balance FROM virtual_points').fetchone()[0],110)
 def test_insufficient(self):
  with self.assertRaises(sqlite3.IntegrityError):self.round(stake=101)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM game_records').fetchone()[0],0);self.assertEqual(self.db.execute('SELECT COUNT(*) FROM point_records').fetchone()[0],0)
 def test_unimplemented(self):
  self.db.execute("UPDATE games SET status='offline' WHERE id='divine-dragon'")
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO game_records VALUES('r','u','divine-dragon','r',10,20,'{}',CURRENT_TIMESTAMP)")
 def test_stale_admin_update(self):
  self.db.execute("INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance) VALUES('p','u','admin',5,100,105)")
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance) VALUES('q','u','admin',5,100,105)")
 def test_catalog_upgrade_preserves_custom_content_and_offline_state(self):
  self.db.execute("UPDATE games SET description='custom description',status='offline',version='0.1.0' WHERE id='golden-god'")
  self.db.executescript((ROOT/'scripts/catalog-v02.sql').read_text())
  self.assertEqual(self.db.execute("SELECT description,status,version FROM games WHERE id='golden-god'").fetchone(),('custom description','offline','0.2.0'))
  self.db.execute("UPDATE games SET description='edited v02' WHERE id='golden-god'")
  self.db.executescript((ROOT/'scripts/catalog-v02.sql').read_text())
  self.assertEqual(self.db.execute("SELECT description FROM games WHERE id='golden-god'").fetchone()[0],'edited v02')
 def test_immutable_ledgers(self):
  self.round()
  for sql in ["UPDATE game_records SET reward=999", "DELETE FROM game_records", "UPDATE point_records SET delta=999", "DELETE FROM point_records"]:
   with self.assertRaises(sqlite3.IntegrityError):self.db.execute(sql)
 def test_ledger_arithmetic(self):
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO point_records(id,user_id,type,delta,before_balance,after_balance) VALUES('bad','u','admin',1,100,999)")
 def test_foreign_key(self):
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("INSERT INTO favorites(user_id,game_id) VALUES('missing','golden-god')")
 def test_brand_upgrade_preserves_members_roles_and_ledger(self):
  self.db.execute("UPDATE system_settings SET value='AURUM' WHERE key='site_name'")
  self.db.execute("UPDATE events SET content='85项AI原创临时素材可在后台逐张替换并保留版本。' WHERE id='event-gems'")
  self.db.execute("INSERT INTO admin_users(user_id,role) VALUES('u','owner')")
  self.round(key='brand-round')
  before=self.db.execute('SELECT id,user_id,delta,before_balance,after_balance FROM point_records').fetchall()
  self.db.executescript((ROOT/'migrations/0003_haiying_brand.sql').read_text())
  self.assertEqual(self.db.execute("SELECT value FROM system_settings WHERE key='site_name'").fetchone()[0],'海盈国际')
  self.assertNotIn('AI',self.db.execute("SELECT content FROM events WHERE id='event-gems'").fetchone()[0])
  self.assertEqual(self.db.execute("SELECT role FROM admin_users WHERE user_id='u'").fetchone()[0],'owner')
  self.assertEqual(self.db.execute("SELECT balance FROM virtual_points WHERE user_id='u'").fetchone()[0],110)
  self.assertEqual(self.db.execute('SELECT id,user_id,delta,before_balance,after_balance FROM point_records').fetchall(),before)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM game_records').fetchone()[0],1)
 def test_concurrent_balance(self):
  def play(i):
   conn=sqlite3.connect(self.path,timeout=10)
   try:conn.execute("INSERT INTO game_records(id,user_id,game_id,request_key,stake,reward,result) VALUES(?, 'u','golden-god',?,50,0,'{}')",(str(i),str(i)));conn.commit();return True
   except sqlite3.IntegrityError:conn.rollback();return False
   finally:conn.close()
  with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:results=list(executor.map(play,range(10)))
  self.assertEqual(sum(results),2);self.assertEqual(self.db.execute('SELECT balance FROM virtual_points').fetchone()[0],0)
if __name__=='__main__':unittest.main(verbosity=2)
