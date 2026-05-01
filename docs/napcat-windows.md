# NapCat Windows 安装与接入教程

这份教程面向 Windows 10 / Windows 11 用户，目标是让 NapCat 把 QQ 群消息通过 OneBot v11 WebSocket 发给本项目。

本项目只需要 NapCat 的「WebSocket 服务端 / 正向 WS」能力：

```text
QQ / NapCat -> ws://127.0.0.1:3001 -> onebot-code-listener -> data/codes.log
```

不要把本项目配置成真实游戏兑换接口，也不要使用它做高频提交或绕过平台限制。

## 准备

- 一台 Windows x64 电脑。
- 一个测试 QQ 号，建议不要用主号。
- 一个测试群，建议先只在这个群里验证。
- Node.js 18 或更高版本。
- Git，用来拉取本项目。
- 本项目仓库访问权限。这个仓库是 private，朋友需要先被加为 collaborator。

官方入口：

- NapCat 文档：https://www.napcat.wiki/
- NapCat Releases：https://github.com/NapNeko/NapCatQQ/releases

如果没装 Node.js 和 Git，可以先装：

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

也可以从官网手动下载安装：

- Node.js：https://nodejs.org/
- Git：https://git-scm.com/

安装完成后，重新打开 PowerShell，再检查：

```powershell
node -v
npm -v
git -v
```

确认系统是 64 位：

```powershell
wmic os get osarchitecture
```

如果输出是 `64-bit`，可以继续。NapCat Windows 一键包按官方说明适用于 `Windows.AMD64`，32 位 Windows 不建议使用这套流程。

## 1. 推荐安装方式：Windows 一键包

官方 Windows 一键包适合第一次使用，优点是步骤少，包里已经内置 QQ 和 NapCat。

1. 打开 NapCat Releases：

   ```text
   https://github.com/NapNeko/NapCatQQ/releases
   ```

2. 下载最新版本里的：

   ```text
   NapCat.Shell.Windows.OneKey.zip
   ```

3. 解压到一个简单路径，建议不要放在带中文、空格或权限复杂的位置，例如：

   ```text
   C:\NapCat
   ```

4. 进入解压后的目录，双击：

   ```text
   NapCatInstaller.exe
   ```

5. 等它自动配置完成。

6. 进入生成的目录，名字通常类似：

   ```text
   NapCat.xxxx.Shell
   ```

7. 双击启动：

   ```text
   napcat.bat
   ```

8. 按终端提示登录测试 QQ 号。

启动后不要关闭这个终端窗口。窗口关掉后，NapCat 也会停止运行。

如果 Windows 安全中心或防火墙弹窗，只用于本机测试时允许专用网络即可。不要把 NapCat 直接暴露到公网。

## 2. 备选安装方式：Shell 手动启动

如果电脑上已经安装了新版 QQ，也可以用 Shell 手动启动方式。

1. 从 NapCat Releases 下载：

   ```text
   NapCat.Shell.zip
   ```

2. 解压到简单路径，例如：

   ```text
   C:\NapCatShell
   ```

3. 确认 Windows 版 QQ 已安装并能正常登录。

4. Windows 11 双击：

   ```text
   launcher.bat
   ```

5. Windows 10 双击：

   ```text
   launcher-win10.bat
   ```

也可以在 PowerShell 里带 QQ 号启动，方便快速登录：

```powershell
.\launcher.bat 123456789
```

Windows 10 使用：

```powershell
.\launcher-win10.bat 123456789
```

第一版给朋友用时，优先推荐上一节的一键包。

## 3. 打开 NapCat WebUI

NapCat 启动后，控制台会打印 WebUI 地址和 token。常见形式类似：

```text
http://127.0.0.1:6099/webui?token=xxxx
```

把这个地址复制到浏览器打开。

注意：

- WebUI token 通常是随机生成的。
- 不要把 WebUI token 发给别人。
- 找不到地址时，在 NapCat 终端里找 `WebUI`、`token`、`6099` 等字样。

## 4. 配置 OneBot v11 WebSocket

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

保存配置后，NapCat 端的 WebSocket 地址就是：

```text
ws://127.0.0.1:3001
```

## 5. 拉取本项目

朋友需要先被加入这个 private GitHub 仓库的 collaborator，否则无法拉取。

打开 PowerShell，运行：

```powershell
git clone https://github.com/Mikusc/onebot-code-listener.git
cd onebot-code-listener
npm install
```

如果 `git clone` 要求登录 GitHub，按浏览器提示登录被加入 collaborator 的 GitHub 账号。

如果提示没有权限，先确认：

- GitHub 邀请已经接受。
- 登录的是被邀请的账号。
- 仓库地址是 `https://github.com/Mikusc/onebot-code-listener.git`。

## 6. 用 Dashboard 配置本项目

推荐朋友优先用 Dashboard 配置，少改 JSON 文件。

在项目目录运行：

```powershell
npm run dashboard
```

浏览器打开：

```text
http://127.0.0.1:8788
```

Dashboard 里填写：

```text
NapCat WebSocket URL：ws://127.0.0.1:3001
Access Token：第一轮测试留空
监听范围：指定群，或全部群
群号：测试群群号；监听全部群时不用填
兑换码正则：\b\d{16}\b
去重文件：data/seen-codes.json
日志文件：data/codes.log
剪贴板：按需要开启
本地测试推送：按需要开启
```

点「保存配置」，再点「测试 WebSocket」。如果显示连接成功，配置就可以用于监听。

也可以用命令行配置：

```powershell
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

如果已经拉取过仓库，后续更新用：

```powershell
cd onebot-code-listener
git pull
npm install
npm run dashboard
```

## 7. 启动前检查

运行：

```powershell
npm run doctor
```

如果配置正确，检查会连接到 NapCat 的 WebSocket。

常见失败原因：

- `ECONNREFUSED 127.0.0.1:3001`：NapCat 没启动、WebSocket 服务端没启用，或端口不是 `3001`。
- token 相关错误：NapCat 里设置了 token，但本项目 `accessToken` 没填或填错。
- Node.js 版本过低：升级到 Node.js 18 或更高版本。
- PowerShell 找不到 `node`、`npm` 或 `git`：安装后重新打开 PowerShell。

## 8. 启动监听

保持 NapCat 终端窗口运行，再打开一个新的 PowerShell 窗口，在项目目录运行：

```powershell
npm start
```

然后在测试群里发送：

```text
测试兑换码 1271751016725504
```

如果链路正常，PowerShell 会看到类似输出：

```text
[code] 2026-05-01T08:00:00.000Z group_id=518496530 user_id=10001 code=1271751016725504 latency_ms=500 message="测试兑换码 1271751016725504"
```

同时会写入：

```text
data\codes.log
```

重复发送同一个兑换码不会再次写入，因为程序会用 `data\seen-codes.json` 去重。

如果用 Dashboard 修改了配置，需要停止监听器后重新执行 `npm start`。

## 9. 常见问题

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
- 这个兑换码是否已经出现在 `data\seen-codes.json`，重复码不会再次输出。
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

### 提示缺少运行库或 DLL

先安装 Microsoft Visual C++ Redistributable：

```text
https://aka.ms/vs/17/release/vc_redist.x64.exe
```

安装后重新打开 NapCat。

### 端口被占用

如果 `3001` 被占用，可以在 NapCat WebUI 里换成另一个端口，例如 `3002`，然后本项目 `config.json` 也要同步修改：

```json
{
  "wsUrl": "ws://127.0.0.1:3002"
}
```

## 安全建议

- 用测试号和测试群做链路验证。
- 不要把 WebUI token、QQ 号密码、`config.json`、`data\codes.log` 发给别人。
- 不要把 `localSubmitUrl` 指向真实游戏兑换服务器。
- 不要高频提交、批量抢兑或绕过平台限制。
- 本项目第一版只用于验证监听、提取、去重、队列和日志链路。
