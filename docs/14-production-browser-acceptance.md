# 注册修复后的线上只读浏览器验收

检查时间与逐项结果见production-readonly-browser-results.json。受测主站为https://h6688.win，实际运行程序为scripts/qa-production.mjs。

Cloudflare Workers Builds已将a2f81c0发布成功（2026-11-01 09:51:34 UTC）。随后确认线上HTML包含新的auth-turnstile-widget容器，并在真实浏览器访问中检查SDK的render方法与实际组件子节点，不再只判断页面HTTP200。

## 实测结果

- 60个不同的游戏封面/横幅接口全部返回200及图片类型。
- 匿名访问/api/profile和/api/admin/statistics被拒绝。
- Chromium 1440px桌面、375px手机、820px平板各检查首页、大厅、登录、注册、个人中心、后台及黄金财神运行页面，共21项。
- 大厅加载更多至30款、搜索神秘宝库、清空搜索恢复列表可用。
- 登录和注册页实际加载Cloudflare Turnstile SDK，并挂载验证组件；没有自动解决真实挑战，也未提交生产注册。
- 黄金财神实际Canvas加载；游客点击开始提示先登录，无积分请求。
- 页面宽度检查通过，游戏图片在滚动加载后再截图。
- 页面脚本异常0，生产写入请求0；保护性请求拦截器未触发。

截图见qa/production。受测浏览器是独立实例，环境代理证书导入了隔离的测试NSS信任库，TLS校验保持开启；没有改动用户浏览器或主机全局证书库。

## 验收边界

上述手机和平板是Chromium模拟视口，不是实体设备或Safari。真实用户的挑战完成、注册/登录、积分结算、后台CRUD和素材上传仍需本人账户验收。当前等待用户完成真实注册并提供个人中心UUID，以继续首位管理员初始化。不能把组件挂载成功当作注册成功。

## 报告分支

报告保存在audit/production-turnstile-20261101分支，main维持已发布的修复提交，避免仅为保存检查记录再触发一次生产构建。后续功能更新时可以将报告合并回main。
