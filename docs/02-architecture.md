# 架构与已实现边界

Next.js 15 App Router / React 19 / TypeScript strict / Tailwind 4 / Framer Motion / Lucide。
通过 OpenNext Cloudflare 编译为 Workers，原生 D1 prepared statements（没有 Prisma / PostgreSQL 驱动混用）。R2 使用 Worker 绑定，不向浏览器暴露密钥。

`app/[[...slug]]` 渲染前台和后台壳，`app/api/[...path]` 是本项目自己的业务API。业务API只通过 `server/db.ts` 数据访问层访问D1。游戏渲染器动态加载Phaser，服务端不渲染Canvas。

首批独立程序：

- `games/golden-god/rules/index.ts`：3×3、五线、Wild替代；独立 `scenes/Main.ts`，金色神殿主题。
- `games/dragon-world/rules/index.ts`：5×3、从左连续243路、Wild与三Scatter翻倍；独立青龙场景。
- `games/phoenix-legend/rules/index.ts`：6×5、正交五连集群、重力补充、最多五次递增倍率；独立凤凰场景。

`game-engine` 只共享随机源、场景基类、加载、格子表现、音效和游戏容器；三款分别配置独立的合成背景旋律。结算规则在各自程序目录。其余27个目录只是待开发配置与规则调研档案，禁止发布或启动，不能视为30款已完成游戏。

## 积分与幂等

登录→同源请求验证→限流→游戏状态/积分参数→检查幂等键→Web Crypto拒绝采样→服务器规则→插入game_records。
D1触发器在同一事务检查余额、写point_records、更新virtual_points和leaderboard。用户+request_key唯一索引确保重复请求不再扣分。并发失败时重新读取已存在记录。游戏客户端在sessionStorage保存未确认请求ID，网络失败使用同一个ID重试。

## 内容与后台

前台游戏数据、分类、收藏、历史、积分、排行榜、公告、消息、活动均有数据库API；服务不可用时只显示带标识的本地目录，不能离线伪造会员或结算。
后台通过统一的字段白名单CRUD连接真实D1，角色分为owner/editor/support；用户封禁、积分调整、内容和素材操作写审计日志。管理员首次由运维脚本提升已注册用户，不存在默认生产管理员密码。

素材上传到版本化R2 key；替换版本保留 predecessor_id。素材ID与游戏、首页设置关联，正式素材无需修改组件。后台支持批量上传、搜索、预览、删除、版本上传及浏览器居中裁切压缩。删除仍被引用的素材会由外键阻止。暂无任意拖拽裁切、自动迁移引用或CDN图像变换。

## 未完成项目

已实际生成85项原创AI临时美术（60张游戏图、首页1张、活动5张、图标17张、背景装饰2张），全部导入本地R2/D1。30款原版游戏规则未取得；27款完整独立程序未开发；免费游戏和录制背景音乐未完成；自定义域名、GitHub远程仓库、生产Cloudflare资源和Turnstile未创建/绑定；浏览器可视化、触摸、全屏和真机QA未执行；没有正式上线声明。
