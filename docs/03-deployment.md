# Cloudflare 部署与运维

本地环境 `wrangler whoami` 仍未认证；用户已通过Cloudflare Workers Builds实际发布主站https://h6688.win。线上只读验收与剩余检查见12-production-deployment-status.md。以下保留部署与运维流程。

## 本地

Node24、Python3。`npm ci` → `npm run db:local` → `node scripts/seed-if-empty.mjs --local wrangler.jsonc` → 导入原图和WebP（见08-asset-delivery.md）。
仅本地可创建 `.dev.vars` 写 `REQUIRE_TURNSTILE=false`。生产保留true。
`npm run dev`。端到端测试 `node tests/api-integration.mjs` 只允许localhost，创建随机测试账号并临时提升本地测试管理员。切勿针对生产执行。
`npm run typecheck`、`npm test`、`python3 tests/database_test.py`、`npm run cf:build`。
构建Workers预览：`npx wrangler dev --port 8787`。若宿主HOME只读，可设置 `XDG_CONFIG_HOME` 为当前工作区内可写目录；不要改写HOME。

## 创建生产资源

先在受控环境中配置Cloudflare API token及account ID，不在聊天、仓库或命令参数中写入密钥。
Token权限范围：目标账号Workers编辑、D1编辑、R2编辑；DNS仅在需要自动域名管理时授权。

```
npx wrangler whoami
npx wrangler d1 create aurum-db
npx wrangler r2 bucket create aurum-assets
```

将创建返回的真实database_id替换 `wrangler.jsonc` 占位字段。`npm run db:remote`，然后仅首次运行 `npm run seed:remote`。seed非幂等，不应每次部署重放。
`python3 scripts/finalize-assets.py` → `npx wrangler d1 execute aurum-db --remote --file scripts/generated-assets.sql` → `node scripts/import-assets.mjs --remote` 将实际生成素材放入R2并更新D1引用；失败会停止，已上传对象保留。大图在R2；可用R2生命周期清理孤立对象。
在Turnstile控制台创建站点，添加实际域名；把site key写入Worker普通变量，把secret通过 `npx wrangler secret put TURNSTILE_SECRET_KEY` 设置。保持 `REQUIRE_TURNSTILE=true`。本地.dev.vars不随源码部署。
`npm run deploy`。必须记录Wrangler返回的真实Worker URL并执行验收，不能把配置文件当成部署结果。

## 首个管理员

注册自己的账号，读取profile用户UUID。
`node scripts/bootstrap-admin.mjs --remote USER_UUID`。这是运维命令，只向已确认的本人账号授予owner。以后在后台添加管理员；禁止删除或修改当前owner自身。

## 域名、DNS、HTTPS

需要项目方提供实际域名及域名对应Cloudflare zone。Workers → Settings → Domains & Routes添加主域名（或在已确认zone中配置custom_domain路由）。启用代理DNS、Universal SSL和Full(strict)。
代码 middleware.ts 已实现 www.h6688.win 以301跳转到 https://h6688.win 并保留路径和查询参数；wrangler.jsonc 已为两个域名声明 custom_domain，需账户权限才能生效。也可使用Cloudflare Redirect Rules替代；禁止指向未提供的虚构域名。启用Always Use HTTPS。R2保持私有，通过本项目 `/api/assets/:id` 授权映射提供只读媒体；需要独立静态域名时再绑定R2自定义域名并验证CORS与CSP。API及会员响应no-store，版本化媒体长期缓存。
WAF在控制台启用托管规则；对auth路径设置速率限制，保留应用D1限流。先观察规则误报，再启用阻断。

## GitHub

仓库为https://github.com/haiwai007/two（用户指定的公开仓库），保留原MIT许可证与提交历史；main生产、preview预览。配置production/preview两个GitHub Environment及各自Cloudflare secrets；preview必须使用独立D1/R2，替换preview配置占位ID。workflow验证通过后才部署；预览分支不访问生产库。production作业现在会创建或复用D1/R2/Turnstile，安全地只在空库seed，并导入素材；具体流程和本次Actions阻塞见10-first-cloudflare-deployment.md。

## 备份及回滚

`npx wrangler d1 export aurum-db --remote --output backup-YYYYMMDD.sql`，备份保存受控私有存储并设置保留期。结合D1 Time Travel恢复窗口和R2版本key；恢复前在独立数据库演练。旧迁移不可修改，追加新迁移；发布前备份。Workers版本回滚不会回滚D1结构，迁移必须前后兼容。

## 故障排查

- 503：检查DB/BUCKET绑定、迁移、Worker日志；`npx wrangler tail`。
- 403来源：检查反向代理Host、X-Forwarded-Proto与浏览器Origin一致；不关闭同源校验。
- 登录验证不可用：检查Turnstile site/secret、实际域名白名单、网络。
- 资源404：核对game_assets.storage_key和R2对象、导入日志。
- 积分冲突：保留requestKey重试，核对game_records唯一键及point_records；不可在前端补余额。
- 依赖冲突：使用锁文件npm ci；本次已修复Wrangler4.156与workers-types5的版本冲突。

## 生产验收（待执行）

首页、大厅、注册登录、账号资料、收藏、30款游戏Canvas/动画/音效/全屏、积分和记录、后台权限/CRUD、R2上传/替换/删除、手机平板、HTTPS、主域名及www跳转、Turnstile及WAF、Workers错误日志。没有完成这些检查前，不应标记正式上线。

## 本次验证补充
已实际生成85项AI PNG并导入本地R2，85条D1素材记录关联成功。兼容日期固定为2026-10-30，与本次安装的workerd支持范围一致；日期不必等于日历当天。素材输出的实际像素尺寸记录在manifest中，PNG母图维度保持原始输出；WebP交付版本已统一为1920×1080、800×600、512×512及首页1920×800。
