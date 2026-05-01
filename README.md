# NapCat / OneBot v11 群消息兑换码提取链路验证工具

这是一个用于验证 NapCat / OneBot v11 群消息监听链路的小工具。它会从 QQ 群消息里提取兑换码，做去重、排队、日志记录，并可选复制到剪贴板或 POST 到本地测试接口。

默认不会连接任何真实游戏兑换接口，也不包含高频抢兑、风控绕过、反检测或验证码绕过能力。

## 功能范围

会做：

- 连接 NapCat 提供的 OneBot v11 WebSocket。
- 监听 QQ 群消息。
- 从 `raw_message` 或 `message` 文本段提取兑换码。
- 默认匹配 16 位数字，例如 `1271751016725504`。
- 内存和文件双重去重。
- 按顺序处理新兑换码。
- 写入 `data/codes.log`。
- 可选复制指定兑换码到剪贴板。
- 可选 POST 到本地测试接口。
- 提供本地 HTML Dashboard 管理配置。

不会做：

- 不请求真实游戏兑换服务器。
- 不做高频抢兑。
- 不做风控绕过、反检测、验证码绕过。
- 不上传你的 `config.json`、日志或历史兑换码。

## 第一次使用

如果朋友需要安装 NapCat，先看对应系统教程：

- [NapCat macOS 安装与接入教程](docs/napcat-macos.md)
- [NapCat Windows 安装与接入教程](docs/napcat-windows.md)

### 1. 拉取项目并安装依赖

需要 Node.js 18 或更高版本。

如果还没有项目目录，先拉取仓库：

```bash
git clone https://github.com/Mikusc/onebot-code-listener.git
cd onebot-code-listener
```

然后安装依赖：

```bash
npm install
```

### 2. 配置 NapCat WebSocket

在 NapCat WebUI 里启用 OneBot v11 WebSocket 服务端：

```text
类型：WebSocket 服务端
host：127.0.0.1
port：3001
token：第一轮测试先留空
messagePostFormat：array
启用：是
```

对应的本地地址是：

```text
ws://127.0.0.1:3001
```

如果 NapCat 设置了 `token`，本项目的 `AccessToken` 必须填写同一个值。

### 3. 打开 Dashboard

推荐用 Dashboard 配置，不需要手动改 JSON。

```bash
npm run dashboard
```

浏览器打开：

```text
http://127.0.0.1:8788
```

Dashboard 里建议先填：

```text
NapCat WebSocket URL：ws://127.0.0.1:3001
Access Token：第一轮测试留空
监听范围：指定群，或全部群
群号：测试群群号
兑换码正则：\b\d{16}\b
去重文件：data/seen-codes.json
日志文件：data/codes.log
```

点「保存配置」，再点「测试 WebSocket」。

### 4. 启动监听

保持 NapCat 运行。新开一个终端窗口，在项目目录执行：

```bash
npm run doctor
npm start
```

`npm run doctor` 用来检查 Node.js、依赖、配置文件、`data` 目录和 NapCat WebSocket 连通性。

`npm start` 才是真正开始监听群消息。

Dashboard 只是配置页。修改配置后，需要停止监听器并重新执行 `npm start` 才会生效。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dashboard` | 打开本地配置页面 |
| `npm run setup` | 命令行交互式生成 `config.json` |
| `npm run doctor` | 检查配置和 NapCat WebSocket 连通性 |
| `npm start` | 启动群消息监听器 |
| `npm run check` | 检查项目 JavaScript 语法 |

运行时通常需要保持两个窗口：

- NapCat 窗口：负责登录 QQ 和提供 OneBot WebSocket。
- `npm start` 窗口：负责监听、提取、去重、写日志。

Dashboard 窗口只在修改配置时需要开着。

## 配置文件

Dashboard 和 `npm run setup` 都会写入本机专用的 `config.json`。这个文件已被 `.gitignore` 忽略，不会上传到 GitHub。

完整字段示例：

```json
{
  "wsUrl": "ws://127.0.0.1:3001",
  "accessToken": "",
  "targetGroupId": 0,
  "codeRegex": "\\b\\d{16}\\b",
  "dedupeFile": "data/seen-codes.json",
  "outputFile": "data/codes.log",
  "enableClipboard": false,
  "clipboardCodeIndex": 0,
  "enableLocalSubmit": false,
  "localSubmitUrl": "http://127.0.0.1:8787/submit"
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `wsUrl` | NapCat OneBot WebSocket 地址 |
| `accessToken` | NapCat WebSocket token，没有就留空 |
| `targetGroupId` | `0` 表示监听全部群；填群号表示只监听指定群 |
| `codeRegex` | 兑换码提取正则，默认匹配 16 位数字 |
| `dedupeFile` | 历史已见兑换码文件 |
| `outputFile` | 新兑换码日志文件 |
| `enableClipboard` | 是否复制新兑换码到剪贴板 |
| `clipboardCodeIndex` | `0` 表示每个新码都复制；`3` 表示只复制同一条消息里第 3 个码 |
| `enableLocalSubmit` | 是否 POST 到本地测试接口 |
| `localSubmitUrl` | 本地测试接口地址 |

## 设置监听群

监听全部群：

```json
{
  "targetGroupId": 0
}
```

只监听指定群：

```json
{
  "targetGroupId": 123456789
}
```

建议第一轮只监听测试群，确认链路正常后再按需要调整。

## 测试方法

确认 NapCat 和监听器都在运行后，在测试群发送：

```text
测试兑换码 1271751016725504
```

控制台应输出类似：

```text
[code] 2026-05-01T08:00:00.000Z group_id=123456789 user_id=10001 code=1271751016725504 latency_ms=500 message="测试兑换码 1271751016725504"
```

重复发送同一个兑换码不会再次写入日志。

程序会自动创建：

- `data/seen-codes.json`：历史已见兑换码，用于持续去重。
- `data/codes.log`：新兑换码日志，一行一条 JSON。

`codes.log` 示例：

```json
{
  "time": "2026-05-01T08:00:00.500Z",
  "event_time": "2026-05-01T08:00:00.000Z",
  "latency_ms": 500,
  "group_id": 123456789,
  "user_id": 10001,
  "code": "1271751016725504",
  "code_index": 1,
  "code_count": 1,
  "message_summary": "测试兑换码 1271751016725504"
}
```

`latency_ms` 使用 OneBot 事件的 `time` 字段估算。该字段通常只有秒级精度，因此延迟值可能包含最多约 1 秒的取整误差。

## 剪贴板

打开自动复制：

```json
{
  "enableClipboard": true,
  "clipboardCodeIndex": 0
}
```

`clipboardCodeIndex` 控制同一条消息里自动复制第几个兑换码：

- `0`：每个新兑换码都会复制，多个码会按顺序覆盖剪贴板，最后留下最后一个。
- `3`：只复制同一条消息里提取到的第 3 个兑换码。

例如一条消息里有 10 个码，但只想自动复制第 3 个：

```json
{
  "enableClipboard": true,
  "clipboardCodeIndex": 3
}
```

去重仍然生效。如果第 3 个码之前已经记录过，它不会再次进入队列，也不会复制。

## 本地测试推送

打开本地测试推送：

```json
{
  "enableLocalSubmit": true,
  "localSubmitUrl": "http://127.0.0.1:8787/submit"
}
```

`localSubmitUrl` 应该指向你自己的本地测试页面或本地测试服务，不要指向真实游戏兑换接口。

POST body 示例：

```json
{
  "time": "2026-05-01T08:00:00.000Z",
  "event_time": "2026-05-01T08:00:00.000Z",
  "latency_ms": 500,
  "group_id": 123456789,
  "user_id": 10001,
  "code": "1271751016725504",
  "code_index": 1,
  "code_count": 1,
  "message_summary": "测试兑换码 1271751016725504"
}
```

## 常见问题

### Dashboard 能打开，但 `npm start` 没反应

Dashboard 只负责配置。需要另外运行：

```bash
npm start
```

### `npm run doctor` 连不上 NapCat

按顺序检查：

1. NapCat 是否正在运行。
2. NapCat WebUI 里是否启用了「WebSocket 服务端 / 正向 WS」。
3. NapCat 端口是否和 `wsUrl` 一致，例如都是 `3001`。
4. 如果 NapCat 配了 token，`accessToken` 是否一致。
5. 防火墙是否拦截了本地连接。

### 群里发了消息，但没有输出

按顺序检查：

1. `targetGroupId` 是否填错。
2. 监听 QQ 号是否在这个群里。
3. 消息里是否包含符合 `codeRegex` 的内容。
4. 兑换码是否已经出现在 `data/seen-codes.json`。
5. NapCat 的 `messagePostFormat` 是否为 `array`。

### 不是 16 位数字能不能提取

默认不能。默认正则是：

```json
{
  "codeRegex": "\\b\\d{16}\\b"
}
```

如果要测试 12 到 20 位数字：

```json
{
  "codeRegex": "\\b\\d{12,20}\\b"
}
```

修改后重启 `npm start`。

## 安全说明

- 建议使用测试号和测试群做链路验证。
- 不要把 WebUI token、QQ 密码、`config.json`、`data/codes.log` 发给别人。
- 不要把 `localSubmitUrl` 指向真实游戏兑换接口。
- 不要高频提交、批量抢兑或绕过平台限制。
- 不要实现风控绕过、反检测、验证码绕过等规避能力。
- 本项目第一版只用于验证消息监听、提取、去重、队列和本地日志链路。
