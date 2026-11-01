import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
names='黄金财神 龙腾四海 凤凰传奇 神龙宝藏 埃及法老 西游奇缘 三国霸业 海盗秘宝 奇幻森林 魔法学院 宝石王国 水果派对 糖果世界 幸运之星 黄金矿工 东方神话 西方神话 未来世界 动物王国 节日狂欢 神秘宝库 龙之传说 黄金时代 太阳神殿 魔法宝石 星辰之旅 深海秘境 王牌传奇 梦幻花园 财富之门'.split()
slugs='golden-god dragon-world phoenix-legend divine-dragon egypt-pharaoh journey-west three-kingdoms pirate-treasure fantasy-forest magic-academy gem-kingdom fruit-party candy-world lucky-star gold-miner eastern-myth western-myth future-world animal-kingdom festival mysterious-vault dragon-legend golden-age sun-temple magic-gems star-journey deep-sea ace-legend dream-garden fortune-gate'.split()
icons=['財','龍','鳳','◈','𓂀','悟','將','⚓','♧','✦','◆','●','❖','★','⛏','☯','⚡','◎','♌','✺','▣','龍','冠','☀','♦','✧','≈','♠','❀','門']
colors=['#c99a38','#3197a1','#a14b9c','#61945c','#a38949','#cc7a44','#8d5d5d','#4178a3','#49926b','#725bb4','#5d91af','#b67c50','#b65d8f','#7074b4','#9e7d40','#588b8a','#6b6ab1','#447f9c','#818347','#b56a52','#8e6999','#438d8a','#ac8244','#b68f47','#648d88','#6265ac','#426b9d','#994f60','#6c9067','#b48e52']
q=lambda v:"'"+str(v).replace("'","''")+"'"
sql=["INSERT INTO game_categories(id,name,slug,sort) VALUES('slots','老虎机电子游戏','slots',0);"]
catalog=[]
for i,(name,slug,icon,color) in enumerate(zip(names,slugs,icons,colors)):
 status='published' if i<3 else 'planned'
 rule=['原创 3×3 五线连珠：三枚相同或财神 Wild，按图标倍率计奖。','原创 5×3 243路：从左三列连续相同图标；龙珠三枚使本局奖励翻倍。','原创 6×5 集群：五枚正交相邻同色消除，连消倍率递增，最多五轮。'][i] if i<3 else '待开发；授权原版玩法、赔付和参数待确认，未提供运行入口。'
 config={'columns':[3,5,6][i] if i<3 else None,'rows':[3,3,5][i] if i<3 else None,'symbol':icon,'color':color,'original':True,'pendingOriginalRules':True}
 item=dict(id=slug,slug=slug,name=name,status=status,description=f'{name} · 原创奇幻主题。'+('独立规则，虚拟积分体验。' if i<3 else '美术与玩法筹备中。'),rules=rule,version='0.1.0',config=json.dumps(config,ensure_ascii=False),cover_asset_id='cover-'+slug,banner_asset_id='banner-'+slug,category_id='slots',sort=i,featured=int(i<6),hot=int(i<3),program_path='/games/'+slug)
 catalog.append(item)
 # Clearly labelled unique procedural placeholders, NOT AI-generated images.
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><radialGradient id="g"><stop stop-color="{color}"/><stop offset="1" stop-color="#101322"/></radialGradient><pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M40 0L80 40 40 80 0 40Z" fill="none" stroke="#fff" opacity=".06"/></pattern></defs><rect width="800" height="600" fill="url(#g)"/><rect width="800" height="600" fill="url(#p)"/><circle cx="400" cy="270" r="165" fill="none" stroke="#f4d797" opacity=".3"/><circle cx="400" cy="270" r="145" fill="none" stroke="#f4d797" opacity=".15"/><text x="400" y="340" text-anchor="middle" fill="#f5db9f" font-size="180" font-family="serif">{icon}</text><text x="30" y="570" fill="#fff" opacity=".5" font-size="17">原创程序占位 · {i+1:02}</text></svg>'''
 (root/'public/assets'/f'{slug}.svg').write_text(svg)
 for kind in ['cover','banner']:
  key=f'placeholder/{slug}-{kind}.svg'
  target=root/'public/assets'/f'{slug}-{kind}.svg';target.write_text(svg.replace('width="800" height="600"','width="1920" height="1080"') if kind=='banner' else svg)
  sql.append(f"INSERT INTO game_assets(id,storage_key,media_type,size,original_name,game_id) VALUES({q(kind+'-'+slug)},{q(key)},'image/svg+xml',{target.stat().st_size},{q(slug+'-'+kind+'.svg')},{q(slug)});")
 keys=list(item);sql.append(f"INSERT INTO games({','.join(keys)}) VALUES({','.join(q(item[k]) for k in keys)});")
 sql.append(f"INSERT INTO game_integrations(id,game_id,version,status,program_path,rules) VALUES({q(slug+'-v1')},{q(slug)},'0.1.0',{q(status)},{q('/games/'+slug)},{q(rule)});")
 game=root/'games'/slug
 for d in ['scenes','assets','symbols','rules','animations','audio','components','types']:(game/d).mkdir(parents=True,exist_ok=True)
 (game/'config.ts').write_text('export default '+json.dumps({'id':slug,**config,'status':status},ensure_ascii=False)+' as const;\n')
 (game/'README.md').write_text(f'# {name}\n\n状态：{status}。独立程序：{slug}。\n\n{rule}\n\n非授权原版复刻；原版参数全部待确认。\n')
 doc=f'''# {name} 玩法档案
1. 名称：{name}
2. 类型：老虎机电子游戏；{'原创演示' if i<3 else '未实现'}
3. 主界面：{'独立主题 Canvas 场景' if i<3 else '待开发'}
4. 比例：浏览器自适应，900×680逻辑尺寸
5. 转轴数量：{config['columns'] or '待确认'}
6. 每轴图标：{config['rows'] or '待确认'}
7–8. 图标与功能：见 game-engine/rules.ts 与 PhaserRenderer.ts；原版待确认
9–10. 组合与计算：{rule}
11. 特殊图标：{'财神Wild' if i==0 else '龙珠Scatter及Wild' if i==1 else '无' if i==2 else '待确认'}
12. 免费游戏：未实现，不声称原版有或没有
13. 奖励：仅虚拟积分，服务端计算
14. 动画：{'转轴、停止、中奖高亮、金币及集群过渡' if i<3 else '待开发'}
15. 音效：{'Web Audio合成音，主题音阶独立；无录制原版音乐' if i<3 else '待开发'}
16. 流程：登录→选积分→服务端结果与记账→前端动画
17. 帮助：运行页规则弹窗
18. 手机：Canvas等比缩放，44px按钮
19. 已确认：本项目原创规则，不代表授权游戏
20. 待确认：全部原版界面、素材、赔付、Wild/Scatter、免费游戏、RTP、音效及交互
'''
 (game/'rules/analysis.md').write_text(doc)
(root/'lib/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
sql.extend(["INSERT INTO announcements(id,title,content,status) VALUES('welcome','欢迎来到星曜原创游戏','首批三款原创演示已开放。积分仅供体验，无现金价值。','published');","INSERT INTO system_settings(key,value) VALUES('registration_enabled','true');"])
(root/'seed.sql').write_text('\n'.join(sql)+'\n')
(root/'docs/asset-prompts.json').write_text(json.dumps([{'game':n,'slug':s,'cover':f'Original cinematic 3D fantasy game cover inspired by the theme {n}, unique central hero, luxurious materials, dramatic lighting, no words or logos, 800x600','banner':f'Original wide cinematic fantasy scene for {n}, independent composition, no text or trademarks, 1920x1080','status':'pending'} for n,s in zip(names,slugs)],ensure_ascii=False,indent=2))
