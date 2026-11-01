import pathlib,json,struct,hashlib
r=pathlib.Path(__file__).resolve().parents[1]
catalog=json.loads((r/'lib/catalog.json').read_text());assets=[];sql=[]
q=lambda s:"'"+str(s).replace("'","''")+"'"
def add(filename,asset_id,kind,game=None):
 p=r/'public/assets'/filename
 if not p.exists():
  assets.append({'filename':filename,'assetId':asset_id,'kind':kind,'status':'pending'});return False
 raw=p.read_bytes();w,h=struct.unpack('>II',raw[16:24]);item={'filename':filename,'path':'public/assets/'+filename,'assetId':asset_id,'kind':kind,'status':'generated','width':w,'height':h,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'gameId':game};assets.append(item)
 sql.append(f"INSERT INTO game_assets(id,storage_key,media_type,size,original_name,game_id) VALUES({q(asset_id)},{q('bundled/'+filename)},'image/png',{len(raw)},{q(filename)},{q(game) if game else 'NULL'}) ON CONFLICT(id) DO UPDATE SET storage_key=excluded.storage_key,media_type=excluded.media_type,size=excluded.size,original_name=excluded.original_name;")
 return True
add('hero-ai.png','home-banner','home-banner')
for g in catalog:
 for kind in ['cover','banner']:add(g['id']+'-'+kind+'.png',kind+'-'+g['id'],kind,g['id'])
for name in ['event-origins','event-dragon','event-phoenix','event-gems','event-stars']:add(name+'.png',name,'event')
for name in ['slot','trophy','heart','star','gift','bell','shield','crown','coin','dragon','phoenix','gem','sun','moon','key','portal','laurel']:add('icon-'+name+'.png','icon-'+name,'icon')
for name in ['page-background','lobby-decoration']:add(name+'.png',name,'decoration')
for key,value in [('banner_asset_id','home-banner'),('background_asset_id','page-background'),('lobby_decoration_asset_id','lobby-decoration')]:
 if any(a['assetId']==value and a['status']=='generated' for a in assets):sql.append(f"INSERT INTO system_settings(key,value) VALUES({q(key)},{q(value)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value;")
events=[('event-origins','原创世界开放日','探索黄金财神、龙腾四海与凤凰传奇三款原创演示。积分仅用于体验，无现金价值。'),('event-dragon','龙珠探索之旅','认识5×3的243路计奖与本局龙珠共鸣奖励。完整规则见游戏帮助。'),('event-phoenix','见证凤凰涅槃','体验正交相邻五枚集群与重力补充，连消最多五轮。'),('event-gems','独立美术图鉴','临时美术由AI原创生成；正式授权素材未来可通过后台逐张替换。'),('event-stars','星曜开发日志','更多游戏正在筹备中。筹备条目没有启动入口，也不会扣除积分。')]
for aid,title,content in events:
 if any(a['assetId']==aid and a['status']=='generated' for a in assets):sql.append(f"INSERT INTO events(id,title,content,asset_id,status) VALUES({q(aid)},{q(title)},{q(content)},{q(aid)},'published') ON CONFLICT(id) DO UPDATE SET asset_id=excluded.asset_id;")
if any(a['assetId']=='icon-slot' and a['status']=='generated' for a in assets):sql.append("UPDATE game_categories SET icon='icon-slot' WHERE id='slots';")
(r/'docs/assets-manifest.json').write_text(json.dumps({'notice':'Only generated entries correspond to actual imagegen PNG files. SVGs are labelled procedural placeholders, never AI art. Dimensions below are actual generator output; the UI uses object-fit:cover without distortion. Exact pixel standardization can be done with the admin crop tool.','assets':assets},ensure_ascii=False,indent=2))
(r/'scripts/generated-assets.sql').write_text('\n'.join(sql)+'\n')
print(json.dumps({'generated':sum(a['status']=='generated' for a in assets),'pending':sum(a['status']=='pending' for a in assets),'total':len(assets)}))
