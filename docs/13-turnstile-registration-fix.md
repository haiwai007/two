# 注册人机验证组件修复

## 已确认的原因

注册表单中原容器id为turnstile。浏览器的HTML命名全局机制使window.turnstile在SDK加载前就可以指向该DOM节点。原条件只判断window.turnstile是否存在，误判SDK已加载，调用不存在的render函数，跳过实际脚本加载。异常被当作业务服务错误处理；按钮仍可提交空令牌，后端统一提示人机验证失败。

线上只读探针观察到：组件高度0、没有请求Turnstile SDK、window.turnstile存在但未产生令牌。用户截图也未显示验证组件。没有读取或输出用户密码、服务端secret或验证token。

## 修复

- 容器改为auth-turnstile-widget，并检查SDK的render确实为函数。
- 加载、等待验证、已验证和失败状态明确显示；未获得有效令牌时禁用提交，并在submit处理器再次检查。
- 过期和错误回调清空令牌，支持重试；刷新验证只清理组件提示，保留用户名/密码等业务错误。
- 服务端拒绝空/超长令牌，区分secret配置错误、过期/重复使用、Provider故障；检查返回hostname与当前同源请求一致。
- 无效的local IP标记不作为可选remoteip发送。日志仅记录受限错误码，不记录secret、token或请求体。
- 生产Turnstile保持开启，没有改用测试密钥，没有绕过挑战。

## 本地验证

7项服务端校验单元测试通过（stub Provider）；最终OpenNext构建和4项编译产物浏览器回归通过（注册/登录本地流程、单次token失败重试、冷启动SDK脚本加载、验证前提交拦截与组件重试）。真实Cloudflare人机挑战不由这些stub测试冒充。

测试日志：turnstile-server-tests-results.txt、turnstile-browser-tests-results.txt、turnstile-build-results.txt。

## 发布与真实注册

本提交将交由已连接的Cloudflare Workers Builds自动构建。发布后须刷新原有注册页，确认真实组件出现并由用户完成挑战；之后才可确认该用户的真实注册成功。首位管理员初始化暂停，等待本人注册和用户UUID。

官方说明：
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
