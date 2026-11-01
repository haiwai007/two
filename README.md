# AURUM 星曜原创游戏平台 · 0.2

Next.js / React / TypeScript / Phaser 3 Canvas / OpenNext Cloudflare / D1 / R2。

30个条目现已分别实现原创规则、独立程序目录、独立场景装饰、布局、合成音频及规则帮助。它们不是授权原版规则复刻，参考站仍返回403。正式域名为h6688.win，生产Cloudflare账户尚未连接，不能声称正式部署成功。

## 本地启动

```sh
npm ci
npm run db:local
node scripts/seed-if-empty.mjs --local wrangler.jsonc
node scripts/import-assets-local.mjs
node scripts/import-optimized-local.mjs
```

仅本地创建`.dev.vars`：`REQUIRE_TURNSTILE=false`，然后`npm run dev -- --port 3001`。
已有0.1数据时，先执行`npm run db:local`再执行`npm run catalog:local`，保留会员、积分、历史及offline状态。不要重放初始seed。

## 验证

构建Cloudflare产物前先停止同目录的`next dev`，避免同时写入`.next`。CI使用隔离作业。

```sh
npm run typecheck
npm test
python3 tests/database_test.py
TEST_ORIGIN=http://localhost:3001 node tests/api-integration.mjs
TEST_ORIGIN=http://localhost:3001 npm run test:browser
npm run cf:build
```

浏览器测试启动全新隔离的Chromium测试实例，不使用用户浏览器账号。本地可指定`CHROMIUM_EXECUTABLE=/usr/bin/chromium`；CI可用`npx playwright install --with-deps chromium`安装测试浏览器。测试仅接受localhost，创建本地临时会员与管理员，不能针对生产运行。

## 程序与账本

每款程序位于`games/<slug>/rules/index.ts`，场景在`scenes/Main.ts`，音频在`audio/config.ts`。公共引擎只共享绘制、动画和基础网格运算，不用一个赔率配置代替30款规则。

免费揭示、锁定重转等阶段在同一付费局内由服务器一次计算，最多有限次数，不额外扣分、不无限触发。D1触发器把余额、记录、排行和积分流水放在同一事务中；幂等键防重复扣分，旧记录不可修改/删除，每局保存gameVersion。

客户端支持自动10局、快速动画、跳过动画、音效、全屏、帮助及记录；网络不明时停止自动运行并保留按用户隔离的请求ID。

## 素材

85项实际AI原创PNG母图与SHA256、尺寸记录在`docs/assets-manifest.json`。它们已全部实际导入本地R2并关联本地D1，正式R2仍待账户权限。

WebP交付版本由构建期脚本生成，保留全部母图；不会在Workers中运行Sharp等原生图片处理库。详细步骤见素材和部署文档。替换正式素材先上传新版本，再切换对应素材ID。

## 后台与发布

先注册自己的账号，再使用`node scripts/bootstrap-admin.mjs --local USER_UUID`提升本地owner。没有默认生产管理员密码。所有后台模块连接D1，支持owner/editor/support角色；游戏、分类、素材、用户、积分、活动、公告、消息、程序版本和系统设置均有业务API。

发布前执行`node scripts/preflight.mjs`，检查D1 ID、Turnstile、账户ID和Wrangler认证。GitHub仓库为 https://github.com/haiwai007/two ，workflow已提供；Cloudflare GitHub secrets仍待配置。维护Worker可按上海03:00定期清理过期会话/限流，不删除账本。

每个游戏可在配置JSON的symbolAssets中绑定已上传图标ID，进入游戏时读取最新数据库素材，未绑定时使用程序字形。

当前完成范围、真实测试结果和生产阻塞项分别见`docs/06-original-programs.md`、`docs/05-test-report.md`和`docs/07-maintenance.md`。生产DNS/HTTPS、Turnstile/WAF与真实设备验收未完成前，不应标记正式上线。
