# EE308FZ 通讯录 · Address Book

> Extreme Programming 结对编程作业 · 完整前后端实现
> 作业截止：**2026-11-17 23:59（北京时间）**

一个可直接运行的通讯录应用，实现了作业要求的三项核心功能：**收藏（书签）联系人**、**一个联系人多种联系方式**、**Excel 导入导出**，附带完整界面、REST API、自动化测试脚本、代码规范和博客/PSP 文档模板。

---

## 一、作业要求对照表

| 作业要求 | 分值 | 本项目的实现 | 如何验证 |
| --- | --- | --- | --- |
| 页面样式 / 可用界面 | 10 | 响应式卡片 + 表格双视图、浅色/深色主题、详情抽屉、标签导航、批量操作栏、Toast 提示 | 打开首页，切换视图与主题 |
| 收藏（Bookmark）联系人 | 25 | 卡片星标一键收藏、侧栏「我的收藏」独立入口、收藏徽标、批量收藏、导出「收藏」列、导入时按「是」还原收藏 | 点击星标 → 侧栏计数变化 → 导出 Excel 查看「收藏」列 |
| 多种联系方式 | 10 | 单个联系人可挂任意多条联系方式，支持手机/座机/邮箱/微信/QQ/微博/领英/社交账号/地址/网站/其他共 11 类，可指定「主要」、可复制 | 新建/编辑联系人时点「添加一条联系方式」 |
| Excel 导入导出 | 25 | 一人一行、每类信息一列；同类型多条自动扩展「手机2」「邮箱2」；导出当前筛选结果或全部；导入分「上传解析 → 预览 → 选择重复策略 → 确认」；提供标准模板 | 下载模板 → 填写 → 导入预览 → 提交；再导出比对 |
| 云部署（可选加分） | +15 | 单进程单端口，静态页面与 API 同服务，附完整部署步骤 | 见 `docs/云部署指南.md` |
| Git 协作 / 3 次以上提交 / PR / Release / 博客 | 基础分 | 代码规范、分支与提交约定、博客模板（含两份 PSP 表）、演示清单齐全 | 见 `docs/` 与本文第七节 |

> 说明：Git 提交、GitHub 仓库、PR/Release、CSDN 博客、截图与演示视频属于**必须由你和队友真实完成**的部分。本项目只提供代码与文档模板，不代做、也不伪造任何提交记录或佐证材料。
> 逐条需求解读、代码位置与验证方式见 `docs/需求分析与实现对照.md`；从本机环境出发的建仓、3 次提交、PR 与 Release 步骤见 `docs/GitHub上传详细流程.md`。

---

## 二、技术栈与选型理由

| 层次 | 技术 | 为什么选它 |
| --- | --- | --- |
| 后端 | Node.js 18+ · Express 4 | 零编译、依赖少；一个进程同时提供 API 和静态页面，云部署最简单 |
| 存储 | `data/contacts.json` 文件 | 不需要安装/配置数据库，clone 后直接跑；写入采用「临时文件 + rename」保证原子性 |
| Excel | `exceljs` | 纯 JS 实现 `.xlsx` 读写，支持样式、冻结表头、自动筛选、多工作表 |
| 上传 | `multer`（内存模式） | 只在内存解析，不产生临时垃圾文件 |
| 前端 | 原生 HTML + CSS + ES Modules | 无构建步骤、无 CDN、无外部字体，离线和云环境都能直接打开 |
| 测试 | Node 内置 `fetch` + `exceljs` | `npm test` 一键跑通 CRUD / 收藏 / 搜索 / Excel 往返 |

---

## 三、快速开始

**环境要求**：Node.js 18 或更高（本项目在 Node 22 下开发）。

```bash
# 1. 进入项目目录
cd address-book

# 2. 安装依赖（首次执行）
npm install

# 3. 启动服务
npm start
```

浏览器打开 **http://localhost:3000** 即可使用。看到终端输出 `EE308FZ 通讯录 · Address Book` 表示启动成功。

> **Windows 更省事的方式**：直接双击项目根目录的 `start.bat`，它会自动查找本机 Node.js、打开浏览器并启动服务，不要求把 Node 加进 PATH；窗口保持打开即为运行中，按 `Ctrl+C` 停止。想跑测试时，在命令行执行 `start.bat test`。

```bash
# 开发模式（改后端代码自动重启）
npm run dev

# 另开一个终端，运行端到端冒烟测试
npm test
```

> 若 3000 端口被占用：`PORT=8080 npm start`（Windows PowerShell 用 `$env:PORT=8080; npm start`）。
> 数据文件默认在 `data/contacts.json`，可用 `DATA_FILE` 环境变量指定其他位置。

---

## 四、目录结构

```
address-book/
├── package.json                 # 依赖与脚本
├── render.yaml                  # Render 免费层一键部署蓝图（可选）
├── index.js                     # Vercel / Serverless 入口：导出 app，不 listen
├── data/
│   └── contacts.json            # 通讯录数据（含 10 条演示联系人）
├── server/
│   ├── index.js                 # 本地 / ECS 入口：app.listen(PORT, HOST)
│   ├── app.js                   # Express 中间件与路由注册（两个入口共用）
│   ├── config.js                # 端口 / 数据文件 / 上传限制
│   ├── store.js                 # JSON 仓储：CRUD、查询、批量、导入提交
│   ├── routes/
│   │   ├── contacts.js          # /api/contacts 联系人接口
│   │   └── excel.js             # /api/excel 导入导出接口
│   ├── services/
│   │   ├── validate.js          # 数据校验、联系方式类型表、表头别名映射
│   │   └── excel.js             # Excel 生成 / 解析 / 模板 / 往返格式
│   └── utils/response.js        # 统一响应格式
├── public/                      # 前端（纯静态）
│   ├── index.html
│   ├── favicon.svg
│   ├── css/styles.css
│   └── js/
│       ├── api.js               # API 封装
│       ├── utils.js             # 图标、转义、格式化、Toast、确认框
│       └── app.js               # 状态管理、渲染、交互、表单、导入向导
├── scripts/
│   └── smoke-test.js            # 端到端冒烟测试
└── docs/
    ├── API接口文档.md
    ├── 代码规范.md
    ├── 需求分析与实现对照.md      # 原帖评分点 → 代码位置 → 验证方式
    ├── GitHub上传详细流程.md      # 建仓 / 3 次提交 / PR / Release
    ├── 博客模板.md              # CSDN 博客 + 评分对照 + 两份 PSP 表
    ├── 测试与演示清单.md
    ├── Vercel部署详细流程.md
    ├── 免费云部署方案推荐.md     # 免费平台对比 + Render / 免费 ECS 步骤
    └── 云部署指南.md
```

**两人分工建议**：A 负责 `server/` + `scripts/`（接口、存储、Excel、测试），B 负责 `public/`（界面、交互、导入向导）；共同维护 `docs/`。这样双方都有真实的编码提交，也便于在博客里写清楚贡献。

---

## 五、核心功能说明

### 1. 收藏（书签）联系人

- 卡片右上角星标一键切换；收藏的联系人显示「已收藏」徽标。
- 左侧「我的收藏」是独立入口，数量实时统计；顶栏排序可选「收藏优先」。
- 支持勾选多个联系人后批量加入 / 取消收藏。
- 导出 Excel 时写入「收藏」列（`是` / `否`）；导入时识别 `是 / 否 / true / 1 / Y / ★` 等写法，收藏状态可完整往返。

### 2. 多种联系方式

- 新建/编辑表单里可无限添加行，每行选类型、填标签和值，并可标记为「主要联系方式」。
- 详情页按类型展示图标，点击即可复制。
- 搜索框会同时匹配所有联系方式的值（输入手机号也能找到人）。
- 数据模型：`contact.contactMethods: [{ id, type, label, value, primary }]`。

### 3. Excel 导入导出

**导出**

- 「导出 Excel → 导出当前筛选结果」会把当前搜索/收藏/标签条件一并传给后端，做到**所见即所得**；也可以导出全部。
- **每个联系人一行**；姓名、收藏、公司、部门、职位、生日、标签、备注各占一列。
- 联系方式按类型分列；同类型有多条时自动生成 `手机`、`手机2`、`手机3`… 列，列数按数据自动扩展。
- 附带「字段说明」工作表，表头加粗、冻结首行、自动筛选、隔行底色。

**导入（三步，安全）**

1. 上传 `.xlsx` → 后端**只解析不写库**；
2. 前端展示识别列数、可导入条数、跳过原因和数据预览表格；
3. 选择重复策略后确认写入：`全部新增` / `合并到同名联系人` / `跳过同名联系人`。

**表头兼容**：中文列名、带序号的列名（`手机2`）、常见中英文别名（`Phone`、`E-mail`、`公司名称`）、`联系方式` 混合列（用 `;` 分隔并自动判断电话/邮箱/网址）都能识别；未识别的列安全忽略。缺「姓名」列或旧版 `.xls` 会给出明确报错。

不确定格式时，点「下载标准导入模板」，里面有两行示例和一个「填写说明」工作表。

---

## 六、API 一览

统一响应格式：`{ "code": 0, "message": "ok", "data": ... }`，失败时 `code != 0`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/contacts` | 列表：`keyword` `bookmarked` `tag` `sort` `page` `pageSize` |
| POST | `/api/contacts` | 新建联系人 |
| GET | `/api/contacts/:id` | 详情 |
| PUT | `/api/contacts/:id` | 更新联系人 |
| PATCH | `/api/contacts/:id/bookmark` | 收藏切换（不传 body 则取反） |
| DELETE | `/api/contacts/:id` | 删除 |
| POST | `/api/contacts/bulk` | 批量收藏/取消收藏/删除 |
| GET | `/api/contacts/tags` | 标签及数量 |
| GET | `/api/contacts/stats` | 总数/收藏数/联系方式数 |
| GET | `/api/excel/export` | 导出 Excel（可带列表筛选参数） |
| GET | `/api/excel/template` | 下载标准导入模板 |
| POST | `/api/excel/preview` | 上传 `.xlsx`（字段名 `file`），返回解析预览 |
| POST | `/api/excel/commit` | 提交导入：`{ contacts, duplicate }` |

完整请求/响应示例见 `docs/API接口文档.md`。

---

## 七、Git 协作与提交流程（作业要求）

1. **Fork 课程提供的仓库**，在其中一人账号下建立 team repository，把队友加为 collaborator。
2. 开工前先讨论模块边界（建议按 `server/` 与 `public/` 划分）、代码规范（直接引用 `docs/代码规范.md`）和 Git 工作流。
3. 建议分支：`main` 保持稳定，功能开发用 `feat/backend-excel`、`feat/frontend-ui` 等，完成后发 Pull Request 由队友 review 再合并。
4. **两人都要有真实的代码提交**，仓库累计至少 3 次 commit。提交信息用 `feat: ` / `fix: ` / `docs: ` 前缀（见代码规范）。
5. 完成后打一个 Release（例如 `v1.0.0`），并保留 PR 记录。
6. 博客需要的证据：commit 历史截图、两人各自 commit 数、程序截图、完整演示视频、PSP 表。模板与清单在 `docs/博客模板.md`、`docs/测试与演示清单.md`。
7. 各自发布个人 CSDN 博客到课程社区 `2601_FZU-MU_SE`，并在截止前提交自己的博客链接（CSDN 有审核时间，建议提前一天发布）。

> 诚信提醒：提交记录、截图、视频与 PSP 时间应按真实情况记录。模板里的姓名、比例、耗时都是占位示例，请替换为实际数据。

---

## 八、云部署（可选 +15 分）

本项目前后端共用一个端口，部署只需：安装 Node → 上传代码 → `npm install` → `npm start` → 开放安全组端口。建议用 PM2 守护 + Nginx 反向代理绑定域名。

完整步骤（华为云 / 阿里云 / 通用 Linux，含环境变量、端口、防火墙、验证清单）见 `docs/云部署指南.md`。**注意：localhost 链接不算云部署。**

> 优先免费的话先看 `docs/免费云部署方案推荐.md`：推荐 **Render 免费 Web Service**（不用信用卡、零代码改动、约 10 分钟上线）作为第二个公网链接，有余力再补一台国内免费试用 ECS。根目录的 `render.yaml` 是 Render 的一键部署蓝图。

> 原帖写的是 `such as Huawei Cloud or Alibaba Cloud`，即**举例**而非指定平台，腾讯云或任意有公网 IP 的云主机同样可以；且本项标为 `optional`，属于 15 分加分项而非必做。详见 `docs/云部署指南.md` 开头的「平台要求澄清」。

---

## 九、常见问题

| 现象 | 处理 |
| --- | --- |
| 页面提示「无法连接服务器」 | 后端没启动，先执行 `npm start` |
| `npm install` 很慢 | 换国内镜像：`npm install --registry=https://registry.npmmirror.com` |
| 导入提示「旧版 .xls 不支持」 | 用 Excel 打开后「另存为」`.xlsx` |
| 导入 0 条 | 检查第一行是否有「姓名」列；或下载模板对照 |
| 端口被占用 | `PORT=8080 npm start` |
| 数据想恢复初始状态 | 用仓库里的 `data/contacts.json` 覆盖当前文件（先自行备份） |
| 中文文件名乱码 | 浏览器会根据服务端 `Content-Disposition` 的 UTF-8 文件名自动处理，用 Chrome / Edge 即可 |

---

## 十、文档索引

- `docs/API接口文档.md` —— 接口契约与示例
- `docs/代码规范.md` —— 代码标准（博客里可直接放这个文件的 GitHub 链接）
- `docs/需求分析与实现对照.md` —— 原帖要求逐条解读、评分表、实现位置与验证方式
- `docs/GitHub上传详细流程.md` —— 建仓 / 3 次提交 / Publish / 邀请队友 / PR / Release 的可照做步骤
- `docs/博客模板.md` —— 个人 CSDN 博客模板，含作业描述、评分对照与两份 PSP 表
- `docs/测试与演示清单.md` —— 33 项自动化断言说明、验收项、截图清单、演示视频分镜
- `docs/云部署指南.md` —— 上线加分项操作手册（含「平台要求澄清」）
- `docs/Vercel部署详细流程.md` —— Vercel Serverless 部署步骤、限制与排错
- `docs/免费云部署方案推荐.md` —— 免费平台对比、Render 免费部署、国内免费 ECS 领取与部署、不推荐清单
