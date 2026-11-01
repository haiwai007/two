# 素材母图与交付版本

保留85张实际image_gen生成的PNG母图，SHA256在assets-manifest.json，母图未覆盖。优化脚本只在Node构建阶段编码、缩放和居中适配，Workers不调用Sharp或本地文件系统。

交付规格：封面800×600，详情横幅与活动图1920×1080，首页1920×800，图标512×512，背景装饰1920×1080。透明图标保留alpha。各文件的实际字节、尺寸和SHA256列于optimized-assets-manifest.json。

本次85项从240,101,521字节减少至20,568,296字节，节省91.43%。85张原图和85个WebP均逐项校验尺寸与哈希。

## 新安装或升级

```
node scripts/optimize-assets.mjs
npx wrangler d1 execute aurum-db --local --file scripts/optimized-assets.sql
node scripts/import-optimized-local.mjs
node scripts/media-verify.mjs
```

新版seed已包含原图与WebP的170条素材记录及正确游戏关联。已有库先执行optimized-assets.sql再上传WebP。脚本只替换原生素材或本工具生成的旧WebP指针，不覆盖后台上传的正式自定义素材。

生产顺序：通过preflight；空库安全初始化；导入原图；应用optimized-assets.sql；`node scripts/import-assets.mjs --remote --optimized`导入WebP。预览可加`--config wrangler.preview.jsonc`，必须使用独立D1/R2。

WebP ID含内容哈希，旧母图作为predecessor保留，因此已缓存的旧URL不会被偷偷覆盖。游戏实际运行背景从数据库传入，后台替换横幅后新进入游戏会使用新素材，而不是固定文件名。

## 正式游戏符号替换

后台上传PNG/JPEG/WebP后取得素材ID，在对应游戏的配置JSON中添加：

```json
{"symbolAssets":{"0":"已上传的素材ID","1":"另一个素材ID"}}
```

保留配置原有其他字段，图标从0编号，与帮助中的图标顺序一致。新进入游戏会重新读取本项目API的当前素材映射，按比例显示正式图标；未配置位置继续使用明确的程序字形，不冒充AI符号图片。后台验证图片类型与素材存在，并阻止删除仍被符号映射引用的文件。横幅同样从最新数据库绑定读取。
