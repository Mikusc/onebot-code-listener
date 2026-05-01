# NapCat / OneBot v11 群消息兑换码提取链路验证工具

这是一个用于验证 NapCat / OneBot v11 群消息监听链路的小工具。它只做消息监听、16 位数字兑换码提取、去重、队列处理、日志记录，以及可选复制到剪贴板或 POST 到本地测试接口。

默认不会连接任何真实游戏兑换接口，也不包含高频抢兑、风控绕过、反检测或验证码绕过能力。

## 安装依赖

需要 Node.js 18 或更高版本。

```bash
npm install
```

## 给朋友的快速启动

如果朋友需要安装 NapCat，先看对应系统教程：

- [NapCat macOS 安装与接入教程](docs/napcat-macos.md)
- [NapCat Windows 安装与接入教程](docs/napcat-windows.md)

简要流程是：先安装并启动 NapCat，然后在 NapCat WebUI 里启用 OneBot v11 WebSocket 服务端：

```text
类型：WebSocket 服务端
host：127.0.0.1
port：3001
token：留空，第一轮测试先不填
messagePostFormat：array
启用：是
```

然后在本项目目录运行：

```bash
npm install
npm run setup
npm run doctor
npm start
```

`npm run setup` 会生成本机专用的 `config.json`，并询问 NapCat WebSocket 地址、access token、监听群号和兑换码正则。

`npm run doctor` 会检查 Node.js 版本、依赖、配置文件、`data` 目录和 NapCat WebSocket 连通性。

## 配置

复制示例配置：

```bash
cp config.example.json config.json
```

也可以使用交互式配置：

```bash
npm run setup
```

`config.json` 字段说明：

```json
{
  "wsUrl": "ws://127.0.0.1:3001",
  "accessToken": "",
  "targetGroupId": 0,
  "codeRegex": "\\b\\d{16}\\b",
  "dedupeFile": "data/seen-codes.json",
  "outputFile": "data/codes.log",
  "enableClipboard": false,
  "enableLocalSubmit": false,
  "localSubmitUrl": "http://127.0.0.1:8787/submit"
}
```

## NapCat WebSocket 地址

在 NapCat 的 OneBot v11 配置里启用 WebSocket 服务，并把监听地址填到 `wsUrl`。

安装和接入细节见：

- [docs/napcat-macos.md](docs/napcat-macos.md)
- [docs/napcat-windows.md](docs/napcat-windows.md)

NapCat WebUI 中推荐使用：

```text
类型：WebSocket 服务端
host：127.0.0.1
port：3001
messagePostFormat：array
token：可留空
```

常见本地地址示例：

```json
{
  "wsUrl": "ws://127.0.0.1:3001"
}
```

如果 NapCat 配置了不同端口，就把端口改成实际值。

如果 NapCat 的 WebSocket 服务端配置了 access token，把同一个 token 填到 `accessToken`：

```json
{
  "accessToken": "your-token"
}
```

## 设置监听群

`targetGroupId` 为 `0` 时监听所有群消息：

```json
{
  "targetGroupId": 0
}
```

只监听指定群时，填入群号：

```json
{
  "targetGroupId": 123456789
}
```

## 启动

启动前可先运行检查：

```bash
npm run doctor
```

```bash
npm start
```

启动后，程序会自动创建 `data` 目录，并维护：

- `data/seen-codes.json`：历史已见兑换码，用于启动后的持续去重。
- `data/codes.log`：新兑换码日志，一行一条 JSON，包含写入时间、OneBot 消息时间、估算延迟、群号、用户号、兑换码和原始消息摘要。

## 如何测试

1. 确认 NapCat 已连接 QQ，并启用了 OneBot v11 WebSocket。
2. 确认 `config.json` 里的 `wsUrl` 和 `targetGroupId` 正确。
3. 在测试群发送包含 16 位数字的消息，例如：

```text
测试兑换码 1271751016725504
```

控制台应输出类似：

```text
[code] 2026-05-01T08:00:00.000Z group_id=123456789 user_id=10001 code=1271751016725504 latency_ms=500 message="测试兑换码 1271751016725504"
```

重复发送同一个兑换码不会再次写入日志。

`codes.log` 示例：

```json
{
  "time": "2026-05-01T08:00:00.500Z",
  "event_time": "2026-05-01T08:00:00.000Z",
  "latency_ms": 500,
  "group_id": 123456789,
  "user_id": 10001,
  "code": "1271751016725504",
  "message_summary": "测试兑换码 1271751016725504"
}
```

`latency_ms` 使用 OneBot 事件的 `time` 字段估算。该字段通常只有秒级精度，因此延迟值可能包含最多约 1 秒的取整误差。

## 可选功能

### 复制到剪贴板

把 `enableClipboard` 设为 `true` 后，每个新兑换码处理时会复制到系统剪贴板。

```json
{
  "enableClipboard": true
}
```

### 发送到本地测试接口

把 `enableLocalSubmit` 设为 `true` 后，程序会向 `localSubmitUrl` 发送 POST 请求。该地址应指向你自己的本地测试页面或本地测试服务。

```json
{
  "enableLocalSubmit": true,
  "localSubmitUrl": "http://127.0.0.1:8787/submit"
}
```

POST body 示例：

```json
{
  "time": "2026-05-01T08:00:00.000Z",
  "event_time": "2026-05-01T08:00:00.000Z",
  "latency_ms": 500,
  "group_id": 123456789,
  "user_id": 10001,
  "code": "1271751016725504",
  "message_summary": "测试兑换码 1271751016725504"
}
```

## 安全说明

- 建议使用测试号和测试群做链路验证。
- 不要把 `localSubmitUrl` 指向真实游戏兑换接口。
- 不要高频提交、批量抢兑或绕过平台限制。
- 不要实现风控绕过、反检测、验证码绕过等规避能力。
- 本项目第一版只用于验证消息监听、提取、去重、队列和本地日志链路。
