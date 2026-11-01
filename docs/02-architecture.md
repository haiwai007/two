# 0.2 架构与完成边界

Next.js 15 / React 19 / TypeScript strict / Tailwind 4 / Framer Motion / Lucide。OpenNext编译为Cloudflare Workers，D1原生参数化查询，R2绑定私有存储；没有PostgreSQL驱动混用或本地正式数据文件。

## 独立程序

30款都有独立rules/index.ts、config.ts、scenes/Main.ts、audio/config.ts及玩法档案。game-engine只共享网格运算、Phaser Canvas绘制、逐轴停止、结果阶段、动画与安全随机源。不同规则的判定拓扑、变换、倍率及奖励代码独立，详见06-original-programs.md。

免费阶段作为有限的同局结果steps由服务器计算，客户端只播放，不另扣积分。每局gameVersion随结果入库。UI支持最多10局自动运行、快速动画、跳过动画、音效、帮助、记录和全屏；本地未确认请求以用户ID隔离。

## 数据与安全

server/db.ts提供D1访问层。game_records唯一请求键与触发器原子更新余额、积分流水及排行。0002迁移补充算术/整数边界校验及账本不可更新/删除。改密撤销所有会话；Origin检查、角色校验、限流和Turnstile均在服务端。

后台各模块连接D1，owner/editor/support权限不同，数据修改有审计。维护Worker或owner维护接口只清理过期会话/限流，不删积分历史。

## 素材

85张实际生成的AI PNG母图保留；另外85个WebP交付版本按需求尺寸生成，总传输体积减少91.43%。170个本地R2对象及D1记录使用版本/哈希关联。WebP的predecessor是原图，新的内容有新ID。运行背景读取实际游戏banner_asset_id，后台替换无需改代码。

## 尚未完成的外部条件

参考站返回403，没有可靠截图或授权原版规则，不能声称1:1还原；全部30款为独立原创演示，RTP尚未商业认证。Cloudflare账号、真实D1 ID、Turnstile站点及GitHub远程仓库未连接；h6688.win仅有配置，尚未完成生产DNS/HTTPS/WAF验收。浏览器模拟设备测试与物理真机测试分别记录，不能互相冒充。
