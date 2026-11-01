# AURUM 星曜原创游戏平台 — 第一阶段工程版

Next.js / React / TypeScript / Phaser 3 / OpenNext Cloudflare / D1 / R2。

这不是已正式上线的完整30款游戏平台。已实现三种独立原创规则和Phaser场景、会员与虚拟积分账本、真实数据库后台CRUD；其余27款处于planned状态，不能启动。参考站返回Cloudflare 403，无法声称视觉或玩法1:1还原。正式域名已指定为 **h6688.win**，但当前没有Cloudflare认证，未完成生产部署。

## 运行

```sh
npm ci
npm run db:local
npm run seed:local
python3 scripts/finalize-assets.py
npx wrangler d1 execute aurum-db --local --file scripts/generated-assets.sql
node scripts/import-assets-local.mjs
```

仅在本地创建 `.dev.vars` 写入 `REQUIRE_TURNSTILE=false`，然后 `npm run dev`。
生产必须配置Turnstile，保持验证开启。不存在默认管理员密码；注册后可运行 `node scripts/bootstrap-admin.mjs --local USER_UUID` 授予本地账号owner。

## 检查

```sh
npm run typecheck
npm test
python3 tests/database_test.py
node tests/api-integration.mjs  # 需先启动localhost:3000，仅本地D1/R2
npm run cf:build
```

已通过9组规则/时间测试、8组数据库测试、24项编译Worker接口检查，并检查32个页面HTTP响应和85个图片HEAD响应。规则和数据库测试结果、API端到端结果见 `docs/05-test-report.md`。浏览器视觉与真机测试尚未执行。全部85项AI PNG已核验并在本地R2/D1导入；生产R2尚未创建。

## 模块

- `app`：路由、全局样式、自己的API入口。
- `components`：大厅、会员、后台与游戏容器。
- `games`：30个独立目录与调研档案，其中3款有独立规则和场景程序。
- `game-engine`：共享Phaser场景基础、加载与安全随机源。
- `server`：D1数据访问、会话、密码、权限、限流、结算与CRUD。
- `migrations`：D1 SQLite兼容结构、约束、索引与账本触发器。
- `seed.sql`：首次目录初始化，不重复执行。
- `public/assets`：AI生成临时美术与明确标识的SVG备用占位图。
- `docs/assets-manifest.json`：实际素材状态、尺寸、字节数和关联。
- `scripts/import-assets.mjs`：将实际素材导入R2，使用内容哈希存储key，更新D1关联。
- `wrangler.jsonc`：生产，h6688.win 与 www.h6688.win。
- `wrangler.preview.jsonc`：独立预览数据库和存储。

## 部署

配置Cloudflare账号权限、创建D1/R2、替换两个环境中的database_id占位值，再按 `docs/03-deployment.md` 执行。GitHub workflow已提供，但尚未建立远程仓库或配置GitHub secrets。

生产素材导入：先初始化目录，运行 `python3 scripts/finalize-assets.py`，执行生成的metadata SQL，再运行 `node scripts/import-assets.mjs --remote`。预览资源可加 `--config wrangler.preview.jsonc`。不会在没有凭据时声称R2已在生产创建或图片已上传。

系统设置支持 `site_name`、`logo_asset_id`、`banner_asset_id`、`background_asset_id`、`theme_color` 与 `registration_enabled`。图片替换先上传新版本，再将新的素材ID关联到对应游戏或设置，保留旧版本。

## 完成边界

待完成：授权原版资料与视觉复刻、其余27款游戏程序、正式素材替换、真实账号下的Cloudflare/GitHub部署、DNS/HTTPS/Turnstile/WAF配置，以及浏览器、触摸、全屏、音频、并发负载和生产验收。不要把本工程版视为已通过全部上线检查的生产系统。
