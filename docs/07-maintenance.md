# 发布前检查和日常维护

`node scripts/preflight.mjs wrangler.jsonc` 验证真实D1 ID、R2绑定、Turnstile开启与site key、目标account ID以及Wrangler认证。输出只列阻塞项，不输出密钥，不创建资源。未通过时CI生产部署停止。

`node scripts/seed-if-empty.mjs --remote wrangler.jsonc` 只在games为空时首次初始化；之后执行0.2目录升级，保留已下架状态。预览配置使用独立数据库和R2桶。素材导入使用内容哈希key，保持可缓存和可追踪。

维护任务位于workers/maintenance.ts及wrangler.maintenance.jsonc；将其DB绑定替换为生产同一D1的真实ID后部署。Cron每天UTC19:00，即上海次日03:00，每次最多清理5000条过期会话和限流项，写入审计。不删除会员、积分、游戏记录或素材版本。

管理员owner也可POST本项目的/api/admin/maintenance调用同一清理逻辑；其他角色被拒绝。所有余额变动必须通过积分服务与流水，不能关闭触发器直接改旧记录。

现阶段未连接任何生产Cloudflare账户。h6688.win与www跳转已配置，但没有真实绑定或HTTPS验证。也未创建GitHub远程仓库；仓库和GitHub Environment secrets连接后，现有workflow才会实际部署。

正式npm run deploy现在会先执行preflight，不通过不会继续构建/发布。预览与生产均要求验证和浏览器任务通过。首次owner提升脚本也写入审计日志。
