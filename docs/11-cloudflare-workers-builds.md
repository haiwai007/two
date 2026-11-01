# 不使用GitHub Actions的部署方式

使用Cloudflare Workers Builds直接连接 https://github.com/haiwai007/two 。Cloudflare会拉取GitHub源码并执行自己的构建任务，不需要GitHub Actions运行器。

## 控制台填写

在Cloudflare的Workers & Pages创建/导入Git仓库应用，授权Cloudflare的GitHub集成读取haiwai007/two。选择生产分支main，填写：

| 字段 | 值 |
|---|---|
| Worker名称 | aurum-original-games（必须与wrangler.jsonc一致） |
| 根目录 | 仓库根目录 |
| Build command | npm run cf:build |
| Deploy command | npm run deploy:cloudflare |
| 构建变量 NODE_VERSION | 24 |
| 构建密钥 AURUM_CF_API_TOKEN | 已创建且包含D1/R2/Turnstile/Workers/域名权限的API令牌 |
| 构建变量 AURUM_CF_ACCOUNT_ID | h6688.win所属Cloudflare账户的32位ID |

两个AURUM_CF_*配置只放在Build variables and secrets，不放在Worker运行时Variables & Secrets，也不写入仓库。GitHub Secrets无法自动读取或迁移到Cloudflare，需要在Cloudflare的安全输入框重新填写。可以保留Cloudflare默认部署令牌；脚本会在部署子进程中使用明确配置的项目令牌，且保留Workers Builds校验所需的Worker身份变量。

先关闭非main的自动预览构建；生产部署脚本会拒绝WORKERS_CI_BRANCH不是main的调用，避免预览使用生产库。预览部署仍需独立资源与配置。

## 部署过程

构建命令只生成已验证的OpenNext产物。部署命令先运行规则、D1关系/事务和初始化逻辑检查，再创建/复用资源，预检，迁移，安全seed，导入原始及WebP素材，上传主站并设置Turnstile secret，最后只读验证HTTPS、页面、D1/R2、样本图片和www跳转。任一步失败都停止，最后清理临时密钥文件；不包含默认管理员密码。

Node24由.node-version和控制台NODE_VERSION指定；镜像需要python3。依赖按package-lock.json安装。已有参考编译产物和浏览器测试记录在docs/05-test-report.md，新方式的远程执行尚未验证。

可运行`node scripts/deploy-cloudflare.mjs --plan`查看无网络、无凭据的步骤；实际部署需要`npm run cf:build`后运行`npm run deploy:cloudflare`。

## 独立维护Worker

该命令只发布主站。Workers Builds会核对连接的Worker身份，不应在主站构建中清除校验变量去发布aurum-maintenance。维护Worker需单独连接构建或由受控终端部署，使用同一个真实D1 ID和wrangler.maintenance.jsonc。未实际部署前不声称每日清理任务已启用。

## 当前状态

GitHub Actions API反复返回HTTP422账户禁用；本地Cloudflare环境无凭据。已准备替代命令并通过5项初始化测试和4项部署编排测试（stub），尚未连接用户的Cloudflare Workers Builds，也没有生产成功结果。需要用户在控制台完成GitHub授权和安全密钥填写；项目不会把GitHub保存的密钥读取回来。

官方说明：
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
