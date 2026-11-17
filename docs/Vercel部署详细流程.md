# Vercel 部署详细操作流程（EE308FZ 通讯录）

> 目标：把本项目部署到 Vercel，拿到一个 `https://xxx.vercel.app` 的公网链接。
> 依据：Vercel 官方 Express 文档（<https://vercel.com/docs/frameworks/backend/express>）与 Functions 限制文档（<https://vercel.com/docs/functions/limitations>）。
> 作业口径：原帖 1.4 `Web Deployment (optional, 15 points)` 只要求"公网可访问、非 localhost"，**不指定平台**；详见 `docs/云部署指南.md` 开头的「平台要求澄清」。

---

## 0. 先读：三个必须知道的前提

**Vercel 不是传统"云服务器"（ECS）**。它没有 SSH、没有常驻进程、没有可写的项目磁盘，你的 Express 应用会被编译成**一个 Serverless Function**，按需冷启动。这会带来三个直接影响：

| # | 限制 | 对本项目的后果 | 已做的处理 |
| --- | --- | --- | --- |
| 1 | 函数文件系统**只读**，仅 `/tmp` 可写，且**不跨实例共享、冷启动即清空** | 原来往 `data/contacts.json` 写文件会抛 `EROFS`，收藏 / 新建 / 导入全部 500 | 新增根目录 `index.js`，把数据文件改到 `os.tmpdir()`，冷启动用演示数据初始化 |
| 2 | 请求体 / 响应体**硬上限 4.5 MB**，超出返回 `413 FUNCTION_PAYLOAD_TOO_LARGE` | 原 Excel 上传上限 5 MB 会被平台先拦掉 | Vercel 入口把 `MAX_UPLOAD_SIZE` 收紧到 4 MB |
| 3 | `*.vercel.app` 默认域名**在中国大陆访问不稳定**（DNS 污染、部分地区超时；Vercel 官方 KB 承认大陆无 CDN 节点） | 老师可能打不开链接，直接影响 +15 加分 | 无法靠代码解决，见第 5 节与第 9 节 |

> **我的建议（说在前面）**：Vercel 能跑通，但**不适合当这个作业唯一的演示链接**。第 3 条是硬伤。时间紧的话，把它当"备用链接"，主链接用已有的公网地址（见 `docs/博客模板.md` 第 1 节）或按 `docs/云部署指南.md` 部署一台 ECS。

---

## 1. 我已经帮你完成的适配（不用你改代码）

| 文件 | 动作 | 作用 |
| --- | --- | --- |
| `server/app.js` | 新增 | 把「注册中间件与路由」抽成 `configureApp(app)`，本地与 Vercel 共用一份配置 |
| `server/index.js` | 改写 | 只负责本地 `app.listen(PORT, HOST)`，`npm start` / `npm test` 行为不变 |
| `index.js`（项目根） | 新增 | Vercel 入口：直接 `require('express')` 并默认导出 app；设置 `DATA_FILE` 到临时目录、上传上限 4 MB；**不 listen** |
| `.gitignore` | 修改 | 排除 `.vercel/` |

按 Vercel 官方零配置约定：根目录 `index.js` + `public/**` 即可，**本项目故意不写 `vercel.json`**（`public/` 会由 CDN 自动托管，`express.static()` 在 Vercel 上会被忽略，这是官方说明）。第 7 节给了仅在路由异常时才需要加的兜底配置。

**本地验证结果**：`npm test` 仍 **33/33 通过**；单独加载根目录 `index.js` 后，`/api/health`、`/api/contacts/stats`、静态首页、新建联系人写操作全部正常（200/201）。

> 说明：以上依据官方文档编写并做了本地等价验证，但我**无法登录你的 Vercel 账号做真实部署实测**，请务必按第 4 节逐项验收。

---

## 2. 前置条件（截至 2026-11-16 已全部就绪 ✅）

- [x] **Public GitHub 仓库已存在**：`https://github.com/coisiniand/address-book`（HTTP 200，老师可访问）
- [x] 根目录 `index.js`、`server/app.js` 等 Vercel 入口**已提交并推送到 main**（远端 HEAD `82ea01d`，与本地一致，已用 `git show origin/main:index.js` 验证）
- [x] 当前提交历史：`12ec43c Initial commit` → `549d252 feat: add Vercel serverless entry and split express app` → `82ea01d docs: add Vercel deployment guide and free cloud options`（共 3 次，已满足"至少 3 次 commit"；**队友仍需各自做一次提交**）
- [x] `data/contacts.json` 干净：10 条演示联系人、4 条收藏，无真实隐私信息
- [ ] GitHub 账号（Vercel 直接用它登录，最省事）
- [ ] 本机情况：普通终端**没有系统 `git` / `npm`**，但 GitHub Desktop 已安装 → **走网页导入路线，不要用 Vercel CLI**

> 重要：**不用再做任何 GitHub 上传操作**，直接跳到第 3.2 节注册 Vercel 并导入仓库即可。除非你之后又改了代码，才需要重新 Commit + Push。

---

## 3. 详细操作步骤（网页版，逐项照做）

### 3.1 先把最新代码推到 GitHub —— ✅ 已完成，可跳过

已于 2026-11-16 21:25 完成两次提交并推送，仓库 `coisiniand/address-book` 的 main 分支已包含 Vercel 入口。你的 GitHub Desktop 现在应该是干净的（无待提交改动）。

> 若之后又修改了代码，才需要重复：GitHub Desktop 勾选改动 → 填 Summary → `Commit to main` → `Push origin`。漏了 Push，Vercel 拉到的就是旧代码。

### 3.2 注册 / 登录 Vercel

1. 打开 <https://vercel.com/signup> → 选 **Continue with GitHub** → 授权。
2. 若提示选择账号类型，选 **Hobby（免费）**；免费额度对个人作业足够。
3. 授权时若问仓库权限，选 **All repositories** 或至少勾选你这个 `address-book` 仓库。

### 3.3 导入仓库

1. 控制台右上角 **`Add New… → Project`**（或 <https://vercel.com/new>）。
2. 在 **Import Git Repository** 列表里找到 `address-book` → 点 **`Import`**。
   - 找不到？点 `Adjust GitHub App Permissions` 放行该仓库后刷新。
3. 进入 **Configure Project** 页面，按下表填写：

| 配置项 | 填什么 | 说明 |
| --- | --- | --- |
| Project Name | `ee308fz-address-book` | 会变成链接前缀，可自定义 |
| Framework Preset | **Express**（下拉里没有就选 **Other**） | 千万别选成纯静态框架，否则 API 不会被构建成 Function |
| Root Directory | `./`（默认，不改） | 项目就在仓库根 |
| Build Command | **留空** | Express 零配置无需构建 |
| Output Directory | **留空** | 静态资源在 `public/`，由 Vercel 自动托管 |
| Install Command | 保持默认 `npm install` | 会按 `package-lock.json` 安装 express / exceljs / multer |
| Environment Variables | **不用填** | 适配已在 `index.js` 里完成；不要手设 `DATA_FILE` |

4. （可选）`Settings → General → Node.js Version` 选 **22.x**，与本地一致。

### 3.4 部署

1. 点 **`Deploy`**，等待构建（通常 1–3 分钟）。
2. 构建日志出现 `Build Completed` / `Deployment ready` 即成功。
3. 在项目页点 **Visit** 或复制 **Domains** 里的链接，形如：
   ```
   https://ee308fz-address-book.vercel.app
   ```
4. **以后每次 `Push origin`，Vercel 会自动重新部署**，不用手动操作。

---

## 4. 部署后逐项验收（不要只看首页）

| # | 检查 | 期望结果 | 失败时看第 6 节 |
| --- | --- | --- | --- |
| 1 | 打开 `https://xxx.vercel.app/` | 通讯录首页，卡片与侧栏完整 | 首页 404 / 空白 |
| 2 | 打开 `/api/health` | `{"code":0,"message":"ok",...}` | API 404 |
| 3 | 打开 `/api/contacts/stats` | `total: 10, bookmarked: 4` | API 500 |
| 4 | 点一张卡片的星标 → **刷新** | 仍显示已收藏（同一实例内） | 数据"丢失" |
| 5 | 新建一位含 3 条联系方式的联系人 | 列表 +1，详情 3 条齐全 | 500 / EROFS |
| 6 | 导出 Excel → 打开 `.xlsx` | 一人一行、列名正确 | 413 / 下载失败 |
| 7 | 下载模板 → 填两行 → 导入预览 → 提交 | 预览数字正确，列表新增 | 413 |
| 8 | **用手机 4G/5G 流量 + 无痕窗口**打开首页 | 能打开（关键！） | 国内访问打不开 |

> 第 8 项最容易忽略：`vercel.app` 在国内存在 DNS 污染，你自己电脑能开不代表老师能开。

---

## 5. 三个限制的实际表现与应对

### 5.1 数据不是真持久（最重要）

`os.tmpdir()` 在 Vercel 上是 `/tmp`，只在**同一个函数实例存活期间**有效：

- 冷启动、实例回收、扩出第二个实例后，数据会回到初始 10 条；
- 两个并发实例各写各的，可能出现"刚新建的人刷新后不见了"。

**演示时怎么做**：把需要展示的操作（收藏 → 新建 → 导入 → 导出）放在**一次连续的短时间操作里**录视频，通常没问题；不要隔天再看数据。

**要真持久，三条路（按推荐度）**：
1. 换平台：Render / Railway（带磁盘卷）或华为/阿里云 ECS（见 `docs/云部署指南.md`）——改动最小、最贴合作业；
2. 接外部存储：Vercel 控制台 `Storage → Create Database`（KV / Postgres），再把 `server/store.js` 改成异步读写；改动较大，需要改所有路由调用；
3. 接受演示级临时数据，并在博客里如实说明。

### 5.2 4.5 MB 上限

- 上传：入口已把 `MAX_UPLOAD_SIZE` 设为 4 MB，超限时前端会给出中文提示。
- 导出：Excel 响应体同样受 4.5 MB 限制；10 条演示数据完全没问题，若导入上千行后导出可能 413。
- 不要试图靠 `vercel.json` 绕过，这是平台硬限制。

### 5.3 国内访问不稳定

- 免费 `*.vercel.app` 域名被 DNS 污染，部分地区/运营商直接超时；Vercel 官方 KB 明确说明大陆无 CDN 节点、不保证可用性。
- 可选缓解（需要你自己有域名 + Cloudflare 账号）：Vercel `Settings → Domains` 绑自定义域名 → Cloudflare 加 CNAME（先灰云仅 DNS 完成验证）→ 需要时用优选 CNAME 方案。步骤繁琐且**官方不保证稳定**，不作为作业保底方案。
- **结论**：博客里的"公网访问地址"优先填国内可稳定打开的链接；Vercel 链接可以作为附加说明，别当唯一链接。

---

## 6. 常见故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 首页 404 / `NOT_FOUND` | 被识别成纯静态，或 `public/` 没被托管 | Framework Preset 改选 `Express`，Redeploy；确认仓库里 `public/index.html` 存在 |
| 首页正常但 `/api/*` 全 404 | 根 `index.js` 没推上去，或没被识别为 Function | 确认 GitHub 根目录有 `index.js`；加第 7 节兜底 `vercel.json` |
| 接口 500，日志 `EROFS: read-only file system` | 走到了 `server/index.js` 或 `DATA_FILE` 没生效 | 确认没有在 Vercel 环境变量里设 `DATA_FILE`；确认 Framework 是 Express |
| 上传/导出 413 `FUNCTION_PAYLOAD_TOO_LARGE` | 超过 4.5 MB | 减小文件；入口已把上传限到 4 MB |
| `FUNCTION_INVOCATION_FAILED` | 函数启动异常 | `Deployments → 点该次部署 → Functions / Runtime Logs` 看堆栈；常见是依赖安装失败或入口导出错误 |
| 构建失败 `Cannot find module 'exceljs'` | `package-lock.json` 没上传或 Install Command 被改 | 确认锁文件在仓库里，Install Command 恢复 `npm install` |
| 刷新后数据变回 10 条 | 冷启动 / 多实例，`/tmp` 不持久 | 见 5.1，属预期行为，不是 bug |
| 国内打不开、超时 | DNS 污染 / 跨境链路 | 用手机流量复测；按 5.3 换链接或平台 |
| 收藏/新建偶尔不生效 | 多实例各自持有 `/tmp` | 见 5.1；演示时连续操作 |

---

## 7. 可选的兜底 `vercel.json`（仅在路由异常时添加）

零配置正常情况下**不需要**这个文件。若出现「首页 404」或「API 不走函数」，在项目根新建 `vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "builds": [
    { "src": "index.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "index.js" },
    { "src": "/", "dest": "public/index.html" },
    { "src": "/(.*)", "dest": "public/$1" }
  ]
}
```

提交并 Push 后 Redeploy。若加完反而报错（例如提示函数路径不匹配），**删掉这个文件回到零配置**，并在 Vercel 项目 `Settings → General → Framework Preset` 里手动选 `Express`。

---

## 8. 与作业评分的关系

- 原帖云部署是**可选 +15 分**，且明确 `localhost` 不算；Vercel 链接是公网地址，形式上符合。
- 但博客要求写"项目地址 / 访问地址"并附截图与演示视频。若老师打不开链接，这一项就拿不到分——所以**先做第 4 节第 8 项的国内实测**。
- 博客里可以这样如实写：「应用部署于 Vercel Serverless（Express 作为单个 Function，`public/` 由 CDN 托管）；因平台文件系统只读，演示数据存放于函数临时目录，冷启动会重置。另提供 XX 链接作为国内可稳定访问的备用地址。」
- 截图记得带上浏览器地址栏里的 `vercel.app` 域名。

---

## 9. 更稳妥的替代方案（按省事程度）

| 方案 | 数据持久化 | 国内访问 | 适合本作业？ |
| --- | --- | --- | --- |
| 已发布的公网链接（`docs/博客模板.md` 第 1 节） | 是 | 稳定 | ✅ 现成，直接填博客 |
| 华为云 / 阿里云 / 腾讯云 ECS + PM2 + Nginx | 是（真实文件） | 稳定 | ✅ 最贴合作业举例，见 `docs/云部署指南.md` |
| Render / Railway（Node Web Service + Volume） | 是（挂卷后） | 一般 | ⭕ 需注册，免费层会休眠 |
| **Vercel** | 否（`/tmp` 临时） | **不稳定** | ⚠️ 可作备用，不建议唯一链接 |

---

## 10. 上传前最后检查

- [ ] 根目录 `index.js` 已提交并 Push 到 GitHub
- [ ] `node_modules/` 没被上传，`.vercel/` 已忽略
- [ ] 仓库为 Public（Vercel Hobby 也能连私有仓库，但作业要求老师可查看仓库）
- [ ] `data/contacts.json` 无真实隐私信息
- [ ] 本地 `npm test` 33 项通过
- [ ] 部署后按第 4 节 8 项逐条验收，尤其**手机流量实测**
- [ ] 博客里的公网地址填的是国内能稳定打开的那个
