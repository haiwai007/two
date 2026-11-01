-- One-time brand update; member, ledger, role and game-record data are untouched.
UPDATE system_settings SET value='海盈国际' WHERE key='site_name';
UPDATE announcements SET title='欢迎来到海盈国际'
WHERE id='welcome' AND title='欢迎来到星曜原创游戏';
UPDATE events SET title='海盈国际动态'
WHERE id='event-stars' AND title='星曜开发日志';
UPDATE events SET content='85项游戏素材可在后台逐张替换并保留版本。'
WHERE id='event-gems' AND content='85项AI原创临时素材可在后台逐张替换并保留版本。';
UPDATE game_assets SET original_name=replace(original_name,'hero-ai.','hero.')
WHERE id IN ('home-banner','webp-home-banner-a5f076347b') AND original_name IN ('hero-ai.png','hero-ai.webp');
INSERT OR IGNORE INTO audit_logs(id,actor_id,action,target,detail)
VALUES('brand-haiying-international',NULL,'system.brand.migrate','site_name','{"brand":"海盈国际","migration":"0003"}');
