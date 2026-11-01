# 主站发布与线上只读验收

2026-11-01主站 https://h6688.win 已可访问。Cloudflare Workers Builds由用户在控制台连接并执行；当前本地会话仍无生产Cloudflare凭据，没有读取用户的GitHub/Cloudflare密钥。

用户首次日志已完成Worker上传，随后在HTTPS验收时遇到getaddrinfo ENOTFOUND h6688.win，导致构建被记为失败。后来实际查询公共DNS已经返回Cloudflare A/NS记录。不能把发布后的域名检查失败等同于未上传Worker，也不能只因上传结束就声称全部生产验收通过。

默认库User-Agent的检查请求又遇到HTTP403 / Cloudflare1010。依据Cloudflare官方1010说明，改为真实描述检查程序的AURUM-Deployment-Check/0.2标识，没有伪装浏览器、关闭防护或跳过失败检查。该标识请求线上首页和API返回200。

## 已实际完成

由scripts/smoke-production.mjs执行，结果见live-production-smoke-results.txt：

- HTTPS首页、/games、/register、/login、/game/golden-god、/play/golden-god返回HTML。
- /api/health确认数据库可查询和存储绑定存在。
- /api/games返回30款游戏；样本封面响应为图片。
- /api/config启用Turnstile并有site key；未验证真实挑战完成。
- https://www.h6688.win/games?q=smoke以301跳转到https://h6688.win/games?q=smoke。

## 本次修复

DNS暂时失败最多重试13次、间隔10秒；持续失败仍返回非零。403/1010明确报告安全拒绝，不盲目重试或标为成功。客户端使用明确程序标识。上传完成后单独标记HTTPS验收待完成；如果后续检查失败，日志说明已发布版本没有被回滚。新增5项smoke测试与5项部署编排测试通过，全部使用stub验证失败场景。

## 尚未完成

线上注册/登录的真实Turnstile挑战、会员积分结算和幂等、后台CRUD/上传、实体手机和Safari、WAF策略、独立维护Worker定时任务、备份恢复演练仍需生产验收。本次只读检查不创建生产测试会员，不授予管理员，也没有执行生产积分操作。本地旧测试报告不冒充这些线上验收。

官方说明： https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/
