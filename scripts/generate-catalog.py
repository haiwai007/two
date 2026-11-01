"""Generate fresh seed/catalog data, never overwrite authored game programs or scenes."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
defs=json.loads((root/'lib/game-definitions.json').read_text());catalog=json.loads((root/'lib/catalog.json').read_text());manifest=json.loads((root/'docs/assets-manifest.json').read_text());optimized=json.loads((root/'docs/optimized-assets-manifest.json').read_text());bySource={a['sourceAssetId']:a for a in optimized['assets']}
assert len(defs)==30 and len({d['id'] for d in defs})==30
q=lambda value:"'"+str(value).replace("'","''")+"'" if value is not None else 'NULL'
sql=["INSERT INTO game_categories(id,name,slug,icon,sort) VALUES('slots','老虎机电子游戏','slots',"+q(bySource['icon-slot']['assetId'])+",0);"]
for asset in manifest['assets']:
 if asset['status']!='generated':continue
 sql.append("INSERT INTO game_assets(id,storage_key,media_type,size,original_name,game_id) VALUES("+','.join(q(x) for x in [asset['assetId'],'bundled/'+asset['filename'],'image/png',asset['bytes'],asset['filename'],asset.get('gameId')])+');')
for asset in optimized['assets']:
 sql.append("INSERT INTO game_assets(id,storage_key,media_type,size,original_name,game_id,version,predecessor_id) VALUES("+','.join(q(x) for x in [asset['assetId'],'bundled-optimized/'+asset['filename'],'image/webp',asset['bytes'],asset['filename'],asset.get('gameId'),2,asset['sourceAssetId']])+');')
for definition,game in zip(defs,catalog):
 assert definition['id']==game['id']
 game.update(cover_asset_id=bySource['cover-'+game['id']]['assetId'],banner_asset_id=bySource['banner-'+game['id']]['assetId'],status='published',version=definition['version'],config=json.dumps(definition,ensure_ascii=False),rules=definition['rules'])
 keys=list(game);sql.append('INSERT INTO games('+','.join(keys)+') VALUES('+','.join(q(game[k]) for k in keys)+');')
 sql.append("INSERT INTO game_integrations(id,game_id,version,status,program_path,rules,pending_rules) VALUES("+','.join(q(v) for v in [game['id']+'-v02',game['id'],'0.2.0','published',game['program_path'],game['rules'],'授权原版参数仍待确认；本版本为原创规则'])+');')
for key,value in [('registration_enabled','true'),('site_name','AURUM'),('banner_asset_id','home-banner'),('background_asset_id','page-background')]:sql.append('INSERT INTO system_settings(key,value) VALUES('+q(key)+','+q(bySource[value]['assetId'] if value in bySource else value)+');')
sql.append("INSERT INTO announcements(id,title,content,status) VALUES('welcome','欢迎来到星曜原创游戏','30款独立原创游戏已开放；积分仅用于体验，无现金价值。','published');")
for ident,title,content in [('event-origins','原创世界开放日','探索30款独立原创演示，所有奖励均为不可兑换的虚拟积分。'),('event-dragon','龙珠探索之旅','体验243路、龙印扩展与1024路龙焰传承。'),('event-phoenix','见证凤凰涅槃','体验集群、横向融化和中央旋环等不同玩法。'),('event-gems','独立美术图鉴','85项AI原创临时素材可在后台逐张替换并保留版本。'),('event-stars','星曜开发日志','所有玩法均为原创，不代表授权原版规则或认证RTP。')]:
 sql.append('INSERT INTO events(id,title,content,asset_id,status) VALUES('+','.join(q(v) for v in [ident,title,content,bySource[ident]['assetId'],'published'])+');')
(root/'seed.sql').write_text('\n'.join(sql)+'\n');(root/'lib/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n');print('Fresh seed generated: 30 games / 170 original-and-delivery asset records; authored rules/scenes untouched.')
