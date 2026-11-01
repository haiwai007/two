# 首位管理员初始化

用户已提供自己的注册账户UUID并要求初始化首位管理员。主站没有公开提权入口；通过已连接的Cloudflare Workers Builds和受控D1凭据执行scripts/bootstrap-first-owner.mjs --remote。

## 私有配置

在Cloudflare Worker的Settings → Builds → Build variables and secrets中添加AURUM_FIRST_OWNER_ID，类型为Secret，值为本人已注册账户的UUID。这是构建密钥，不是运行时变量；目标UUID及任何身份派生数据均不得提交公开仓库。在有效初始化窗口内，缺少该变量会使初始化步骤报错，不访问数据库、不授予权限，也不把普通部署成功当作授权完成。

scripts/first-owner-window.json仅包含初始化截止时间，不包含账户标识。过期后不执行任何授权；已创建的管理员权限不会随窗口过期而消失。需要再次初始化时，应重新核对现有owner及本人授权。

## 权限保护

只读取指定账户的ID和状态，不读取密码、邮箱等资料，不输出账户ID。账户必须真实存在且启用。若已有不同owner，初始化停止；已有非owner角色不自动改写。参数化INSERT同时检查目标账户状态和owner不存在，避免查询后出现其他owner时覆盖权限。

写入后再次确认目标为active owner，并保存固定ID的admin.bootstrap审计。重复执行不重复创建角色或审计；第一次审计写入暂时失败时可重试补齐。构建输出只报告created/confirmed等状态，不暴露用户ID或密钥。

步骤位于数据库迁移和安全seed之后、素材上传和主站部署之前。没有新增默认用户、默认密码、公开提权API或登录绕过。

## 验证和状态

6项真实内存SQLite测试与1项必填密钥保护测试通过，覆盖目标授权及审计、幂等/审计恢复、已有其他owner、封禁/不存在/非owner角色、窗口过期/未配置、并发写入保护。部署编排测试也通过。日志见first-owner-tests-results.txt。

当前需要用户在Cloudflare私有构建密钥中配置AURUM_FIRST_OWNER_ID，然后重新构建。未获得构建中授权与审计确认前，不声称生产owner初始化成功。成功后本人刷新/admin验证真实会话。
