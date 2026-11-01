# 首次Cloudflare部署自动初始化

GitHub仓库： https://github.com/haiwai007/two 。在Repository Secrets或production Environment配置CLOUDFLARE_API_TOKEN和CLOUDFLARE_ACCOUNT_ID。密钥不得提交源码。

production作业在规则、数据库、编译产物浏览器验证通过后执行：

1. scripts/provision-cloudflare.mjs --remote验证h6688.win是目标账户中的active zone。
2. 创建或复用aurum-db、aurum-assets及项目专用Turnstile widget；不旋转已有secret，不自动切换已指定数据库，不改动其他项目资源。
3. 将真实D1 ID及公开site key写入当前runner的配置。Turnstile secret仅保存到被Git忽略的.test-state/deploy-secrets.json（0600），GitHub日志提前mask。
4. 运行预检、D1迁移、安全首次seed及原创/优化素材导入。
5. 构建并使用Wrangler --secrets-file部署网站；部署维护Worker。
6. 通过HTTPS对首页、大厅、登录注册页面、游戏页面、D1/R2、样本图片、Turnstile公开配置与www跳转进行只读检查。
7. 仅将非秘密的Wrangler配置存为production-resource-config artifact，便于记录真实资源ID；无论成功失败都删除临时secret文件。远程配置不会自动提交main。

该流程不自动创建管理员，也不运行绕过真实Turnstile的生产注册测试。正式会员、后台、真实人机挑战、WAF和实体设备仍需生产验收。若R2未开通或Token权限不足，流程会停止并报告；不关闭验证或使用假ID继续。

## 本次执行状态

2026-11-01已实际尝试workflow_dispatch。GitHub返回HTTP422：Actions has been disabled for this user。工作流状态为active，但账户不能启动Actions。当前GitHub集成也无法读取仓库Actions权限或列出Secrets（HTTP403）；无法据此确认用户填写的secret值是否有效。

先在https://github.com/haiwai007/two/settings/actions恢复允许的Actions设置。如果仓库已允许、仍出现账户级disabled提示，需要通过GitHub账户设置/支持解除账户限制。随后打开https://github.com/haiwai007/two/actions/workflows/cloudflare.yml ，选择main，Run workflow。

本地5项初始化逻辑测试只使用stub API，通过不代表真实Cloudflare资源已创建。Cloudflare环境尚无凭据；当前没有生产部署成功证明。
