# NapCat macOS 安装与接入教程

这份教程面向 MacBook 用户，目标是让 NapCat 把 QQ 群消息通过 OneBot v11 WebSocket 发给本项目。

本项目只需要 NapCat 的「WebSocket 服务端 / 正向 WS」能力：

```text
QQ / NapCat -> ws://127.0.0.1:3001 -> onebot-code-listener -> data/codes.log
```

不要把本项目配置成真实游戏兑换接口，也不要使用它做高频提交或绕过平台限制。

## 准备

- 一台 MacBook。
- 一个测试 QQ 号，建议不要用主号。
- 一个测试群，建议先只在这个群里验证。
- Node.js 18 或更高版本。如果没装，可以从 https://nodejs.org/ 下载 LTS 安装包，或用 Homebrew 执行 `brew install node`。
- 本项目仓库。

官方入口：

- NapCat 文档：https://www.napcat.wiki/
- macOS 安装器：https://github.com/NapNeko/NapCat-Mac-Installer/releases

## 1. 安装 NapCat

1. 先退出正在运行的 QQ。
2. 从官方 GitHub Releases 下载最新的 `NapCat-Mac-Installer`。
3. 打开安装器，按提示安装或更新 NapCat。
4. 如果安装器提示备份 `QQ.app` 里的 `package.json`，先备份，再用安装器提供的修改版文件覆盖。
5. 如果 macOS 提示无法打开应用，确认安装器来自官方 Releases 后，在「系统设置 -> 隐私与安全性」里允许打开。
6. 安装完成后，通过安装器或 QQ 启动 NapCat，并登录测试 QQ 号。

QQ 自身更新后，之前覆盖过的 `package.json` 可能会被还原。如果某天 NapCat 突然无法启动，先用安装器重新检查或重新覆盖一次。

## 2. 打开 NapCat WebUI

NapCat 启动后会提供一个本地 WebUI。常见地址类似：

```text
http://127.0.0.1:6099/webui?token=xxxx
```

WebUI token 通常可以在 NapCat 启动日志里看到。不要把这个 token 发给别人。

如果找不到 WebUI：

- 先确认 QQ/NapCat 还在运行。
- 看安装器是否有「打开 WebUI」之类的入口。
- 检查 NapCat 启动日志里的 `WebUI` 或 `6099` 字样。

## 3. 配置 OneBot v11 WebSocket

进入 NapCat WebUI 后，找到 OneBot v11 或网络配置页面，新建或启用一个 WebSocket 服务端。

推荐第一轮测试使用：

```text
类型：WebSocket 服务端
host：127.0.0.1
port：3001
token：留空
messagePostFormat：array
启用：是
```

注意：

- 这里要选「WebSocket 服务端」或「正向 WS」。
- 不要选「WebSocket 客户端」或「反向 WS」。本项目不是 WebSocket 服务端，它是去连接 NapCat 的客户端。
- `host` 用 `127.0.0.1` 表示只允许本机连接，适合本地测试。
- 如果你填写了 token，后面本项目的 `config.json` 里也要填写同一个 `accessToken`。

## 4. 拉取并配置本项目

第一次使用时运行：

```bash
git clone https://github.com/Mikusc/onebot-code-listener.git
cd onebot-code-listener
npm install
npm run setup
```

如果已经拉取过仓库，后续只需要进入目录再更新依赖和配置：

```bash
cd onebot-code-listener
git pull
npm install
npm run setup
```

`npm run setup` 会生成或更新 `config.json`。按提示填写：

```text
wsUrl：ws://127.0.0.1:3001
accessToken：第一轮测试留空
targetGroupId：测试群群号；填 0 表示监听所有群
codeRegex：默认即可，匹配 16 位数字
```

如果只想监听一个群，把 `targetGroupId` 设置为群号，例如：

```json
{
  "targetGroupId": 518496530
}
```

## 5. 启动前检查

运行：

```bash
npm run doctor
```

如果配置正确，检查会连接到 NapCat 的 WebSocket。

常见失败原因：

- `ECONNREFUSED 127.0.0.1:3001`：NapCat 没启动、WebSocket 服务端没启用，或端口不是 `3001`。
- token 相关错误：NapCat 里设置了 token，但本项目 `accessToken` 没填或填错。
- Node.js 版本过低：升级到 Node.js 18 或更高版本。

## 6. 启动监听

运行：

```bash
npm start
```

然后在测试群里发送：

```text
测试兑换码 1271751016725504
```

如果链路正常，终端会看到类似输出：

```text
[code] 2026-05-01T08:00:00.000Z group_id=518496530 user_id=10001 code=1271751016725504 latency_ms=500 message="测试兑换码 1271751016725504"
```

同时会写入：

```text
data/codes.log
```

重复发送同一个兑换码不会再次写入，因为程序会用 `data/seen-codes.json` 去重。

## 7. 常见问题

### `npm run doctor` 连不上

先确认 NapCat WebUI 里启用的是「WebSocket 服务端」，并且端口和 `config.json` 的 `wsUrl` 一致。

例如 NapCat 配的是：

```text
host：127.0.0.1
port：3001
```

本项目就应该是：

```json
{
  "wsUrl": "ws://127.0.0.1:3001"
}
```

### 能连接，但群里发消息没反应

检查这些点：

- `targetGroupId` 是否填错。
- 监听 QQ 号是否真的在这个群里。
- 消息里是否包含符合 `codeRegex` 的内容。默认只匹配 16 位数字。
- 这个兑换码是否已经出现在 `data/seen-codes.json`，重复码不会再次输出。
- NapCat 的消息上报格式建议使用 `array`。

### 不是 16 位数字能不能监听

默认不能。本项目默认正则是：

```json
{
  "codeRegex": "\\b\\d{16}\\b"
}
```

如果要测试其他长度，需要改 `codeRegex`。例如匹配 12 到 20 位数字：

```json
{
  "codeRegex": "\\b\\d{12,20}\\b"
}
```

### QQ 更新后不能用了

QQ 更新可能覆盖 NapCat 修改过的文件。重新退出 QQ，用 NapCat macOS 安装器检查或重新应用补丁。

## 安全建议

- 用测试号和测试群做链路验证。
- 不要把 WebUI token、QQ 号密码、`config.json`、`data/codes.log` 发给别人。
- 不要把 `localSubmitUrl` 指向真实游戏兑换服务器。
- 不要高频提交、批量抢兑或绕过平台限制。
- 本项目第一版只用于验证监听、提取、去重、队列和日志链路。
