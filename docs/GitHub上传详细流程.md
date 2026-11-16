# GitHub 上传详细操作流程（EE308FZ 通讯录）

> 目标：把 `D:\EE308FZ\address-book` 传到一个 **Public** 的 GitHub 仓库，并留下作业要求的 commit / PR / Release 证据。
> 作业依据：<https://bbs.csdn.net/topics/620593436> · 截止 **2026-11-17 23:59**
> 作业硬性要求：GitHub 仓库 **commit ≥ 3**、上传程序与文档、代码可构建、发布 Release 并发起 PR、两人各自提交、博客里放仓库链接与代码规范链接。

---

## 0. 先读：你本机的实际情况

| 项目 | 实际情况 | 影响 |
| --- | --- | --- |
| 系统 `git` 命令 | **不可用**（`D:\Git` 只剩 PATH 残留，程序已不在） | 普通 CMD / PowerShell 里敲 `git` 会报「不是内部或外部命令」 |
| 系统 `npm` / `node` | **不可用**（Node 只存在于 WorkBuddy 内置环境） | 普通终端敲 `npm` 会失败；运行项目请用 `start.bat` |
| GitHub Desktop | **已安装** | 推荐用它，自带 Git，不需要另外装 |
| 项目位置 | `D:\EE308FZ\address-book` | 上传时选这个目录 |
| 项目启动 | 双击 `start.bat`；测试用 `start.bat test` | 与 GitHub 上传无关，但上传前建议跑一次 |

**结论：用第 2 节的方案 A（GitHub Desktop 图形化）。** 第 3 节的命令行方案是备选，需要先装 Git。

---

## 1. 上传前准备

1. **确认文件齐全**。项目根目录应能看到 `server\`、`public\`、`docs\`、`data\`、`scripts\`、`package.json`、`package-lock.json`、`.gitignore`、`.editorconfig`、`README.md`、`start.bat`。
2. **跑一次测试**（博客要截图）：在 `D:\EE308FZ\address-book` 地址栏输入 `cmd` 回车，执行 `start.bat test`，确认全部通过。
3. **检查隐私**：`data\contacts.json` 里目前是 10 条虚构演示数据。若你手动录入过真实同学/家人的手机号，请先改回演示数据再上传——仓库是 Public 的，任何人都能看到。
4. **确认排除规则**：`.gitignore` 已排除 `node_modules/`、日志、临时文件。`node_modules`（254 个包 / 约 48 MB）**不会也不该上传**，老师 clone 后执行 `npm install` 会按 `package-lock.json` 完整还原，这是标准做法。
5. **准备 GitHub 账号**：网页登录 <https://github.com>；没有账号先注册，验证邮箱。
6. **判断是否需要 Fork**：原帖写了 "Fork the repository"。**如果课程提供了模板仓库**，先在网页上点 `Fork` 到其中一人的账号，然后看 2.2 的「Fork 分支处理」；**如果没给**，直接从 2.2 主流程开始。

---

## 2. 方案 A：GitHub Desktop（推荐，全程点鼠标）

### 2.1 登录账号

打开 GitHub Desktop → 顶部菜单 `File → Options → Accounts` → 点 `Sign in to GitHub.com` → 浏览器里授权 → 回到软件确认显示你的头像和用户名。

> 队友在**自己电脑**上也要做这一步，并用**自己的**账号登录。

### 2.2 建立本地仓库

1. `File → Add Local Repository…`（添加本地仓库）
2. `Choose…` 选择 **`D:\EE308FZ\address-book`**
3. 软件提示「This directory does not appear to be a Git repository」→ 点 **`Create a repository`**（英文界面）／「创建仓库」
4. 弹窗里填写：
   - **Name**：`address-book`
   - **Description**：`EE308FZ Extreme Programming - Address Book (bookmark, multiple contact methods, Excel import/export)`
   - **Git ignore**：**选 `None`**（项目里已经有自己的 `.gitignore`，选模板会冲突）
   - **License**：可选 `MIT`，也可留 `None`
5. 点 `Create repository`。此时仓库只在本地，还没上传到 GitHub。

> **Fork 分支处理**：如果课程提供了模板仓库且你已 Fork，有两种接法，选一种即可：
> - **接法一（不改目录，推荐）**：仍按上面建好本地仓库，然后 `Repository → Repository Settings… → Primary remote repository`，把远程地址改成你 Fork 出来的仓库 URL（形如 `https://github.com/你的用户名/课程仓库名.git`），之后正常 Push。
> - **接法二**：`File → Clone repository…` 把 Fork 克隆到 `D:\EE308FZ\address-book-repo`，再把本项目里除 `node_modules` 外的所有文件复制进去，后续在这个克隆目录里提交。
>
> 若课程没给模板仓库，直接建自己的 Public 仓库即可，同样满足"建立 GitHub 仓库"的要求。

### 2.3 分 3 次提交（直接满足 commit ≥ 3）

左侧 `Changes` 面板勾选文件 → 左下角填 **Summary**（必填，Description 可选）→ 点 `Commit to main`。**按下面顺序做三次**，不要一次性全选：

| 次序 | 勾选的文件 | Summary（可直接复制） | 对应的作业叙事 |
| --- | --- | --- | --- |
| ① | `server\`、`index.js`（根目录）、`render.yaml`、`scripts\`、`package.json`、`package-lock.json`、`.gitignore`、`.gitattributes`（若有）、`.editorconfig`、`start.bat` | `feat: backend API and Excel service` | 后端接口、JSON 仓储、Excel 生成/解析、自动化测试、Vercel 函数入口、Render 部署蓝图 |
| ② | `public\`（整个目录：`index.html`、`css\`、`js\`、`favicon.svg`） | `feat: address book UI and import wizard` | 页面样式、收藏交互、动态联系方式表单、导入向导 |
| ③ | `README.md`、`docs\`、`data\` | `docs: readme, coding standard and blog template` | 需求对照、代码规范、API/部署文档、博客模板、演示数据 |

> `docs\` 里现在包含：`API接口文档.md`、`代码规范.md`、`博客模板.md`、`测试与演示清单.md`、`云部署指南.md`、`需求分析与实现对照.md`、`Vercel部署详细流程.md`、`免费云部署方案推荐.md`、`GitHub上传详细流程.md`（本文件）。第 ③ 次提交会把它们一起带上。
>
> ⚠️ 根目录的 **`index.js` 是 Vercel / Serverless 入口**，必须在第 ① 次提交里一起勾选；漏传的话 Vercel 部署后 `/api/*` 会全部 404。
>
> 根目录的 **`render.yaml` 是 Render 免费层一键部署蓝图**，也放在第 ① 次提交；漏传不影响网页手填方式部署，但会失去 Blueprint 一键导入的便利。
>
> 如果左侧一次显示全部文件不好分辨，可以按目录逐个勾选；**每次提交前确认没有把 `node_modules` 勾进去**（正常情况下它被 `.gitignore` 隐藏，根本不会出现）。

### 2.4 发布到 GitHub

1. 点顶部 **`Publish repository`**
2. **取消勾选 `Keep this code private`** —— 必须 Public，助教/老师才能查看（这一项直接关系博客格式分）
3. 名称保持 `address-book`，Organization 选个人账号
4. 点 `Publish repository`，等待上传完成

### 2.5 打开网页核对

浏览器打开仓库地址 `https://github.com/你的用户名/address-book`，首页应能看到：

- [ ] `README.md` 在下方渲染出来
- [ ] `server/`、`public/`、`docs/`、`data/`、`scripts/` 五个目录
- [ ] `package.json`、`package-lock.json`、`start.bat`、`.gitignore`
- [ ] 顶部显示 **Public** 标记
- [ ] 点开 `docs/` 能看到 `代码规范.md`（博客链接要用）
- [ ] 没有 `node_modules/`

---

## 3. 方案 B：命令行（想用 `git` 命令才需要）

先装 Git：<https://git-scm.com/download/win> → 安装时把路径改成 **`D:\Git`**（其余默认）→ 安装完成后**重开** PowerShell / CMD。

```powershell
cd D:\EE308FZ\address-book

git init
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub绑定邮箱"
git config --global core.quotepath false      # 防止中文文件名显示成八进制乱码

git add server scripts package.json package-lock.json .gitignore .editorconfig start.bat
git commit -m "feat: backend API and Excel service"

git add public
git commit -m "feat: address book UI and import wizard"

git add README.md docs data
git commit -m "docs: readme, coding standard and blog template"

git branch -M main
git remote add origin https://github.com/你的用户名/address-book.git
git push -u origin main
```

`git push` 会弹浏览器登录；如果要求输入"密码"，去 GitHub → `Settings → Developer settings → Personal access tokens` 生成 token 代替密码。**仓库要设为 Public**。

> 装好 Git 后也可以继续用 GitHub Desktop，两者操作的是同一个本地仓库，不冲突。

---

## 4. 团队协作证据（两人都要有提交，别全算在一个人名下）

1. **邀请队友**：仓库网页 → `Settings → Collaborators → Add people` → 输入队友用户名 → 队友在邮箱/通知里接受邀请。
2. **队友在自己电脑**：GitHub Desktop 登录自己的账号 → `File → Clone repository…` → 选这个仓库 → 克隆到自己的 D 盘。
   > ⚠️ **最关键的一步**：让队友先打开 `File → Options → Git`，把 **Name / Email 改成他自己的**。否则他所有提交都会记成你的名字，博客里「两人各自 commit 数」这一项会穿帮。
3. **队友做一个真实小改动**：例如把 `public/css/styles.css` 里的主色改一下，或给 `README.md` 补一句说明 → Commit → `Push origin`。
4. **发 Pull Request**（建议队友在自己分支上改，效果更真实）：
   - GitHub Desktop 里 `Branch → New branch`，命名 `feat/ui-polish`，做完改动后 `Publish branch` → 网页提示 `Compare & pull request` → `Create pull request`
   - 你作为 Reviewer 在网页上 Review → `Merge pull request`
   - **截图 PR 页面**留证
5. **打 Release**：仓库网页右侧 `Releases → Create a new release` → Tag 填 `v1.0.0` → 标题 `v1.0.0 通讯录完整版` → 写一段功能说明（可抄 README 的作业要求对照表）→ `Publish release`。**截图 Release 页面**。
6. **截图提交历史**：仓库首页点 `N commits` → 截整页，数出两人各自的 commit 数，填进博客。

> 如果队友不方便操作，也**不要伪造**：可以按单人项目写博客，如实说明，并在分工/贡献比部分注明。诚信比凑证据重要。

---

## 5. 博客里要填的链接，怎么取

| 博客字段 | 怎么得到 | 形式 |
| --- | --- | --- |
| GitHub 仓库地址 | 仓库首页地址栏 | `https://github.com/用户名/address-book` |
| 代码规范链接 | 网页打开 `docs/代码规范.md`，直接复制**浏览器地址栏** | `https://github.com/用户名/address-book/blob/main/docs/%E4%BB%A3%E7%A0%81%E8%A7%84%E8%8C%83.md` |
| 公网访问地址 | 见下方「已发布链接」；若改用 ECS 则填 `http://公网IP` | 不能是 localhost |
| PR 链接 | PR 页面地址栏 | `.../pull/1` |
| Release 链接 | Release 页面地址栏 | `.../releases/tag/v1.0.0` |
| 演示视频 | B 站 / 其他视频页地址栏 | 需可访问 |

> 中文文件名会被浏览器自动转成百分号编码，**直接从地址栏复制最保险**，不要手敲中文路径。
> 代码规范链接必须是仓库里的文件链接，不是本地路径，也不是百度网盘。

**已发布的公网链接**（可直接填入博客；必须整条复制，含 `?sharecode=` 部分）：

```
https://wbapp-t42kxt59nxbhfujwrrc1kw.app.workbuddy.host/?sharecode=H3GSS33MLH
```

原帖**没有指定必须用阿里云或华为云**（原文 `such as Huawei Cloud or Alibaba Cloud` 只是举例），云部署也是可选加分项。但如果助教版课程通知另行要求"自建 ECS 实例 + 服务器配置截图"，则按 `docs/云部署指南.md` 补一套 ECS 部署，并把博客里的地址换成 ECS 的公网 IP / 域名；平台任选其一即可。

---

## 6. 上传后验证清单

| # | 检查 | 期望 |
| --- | --- | --- |
| 1 | 仓库可见性 | Public |
| 2 | commit 总数 | ≥ 3，且两位成员都有提交 |
| 3 | 目录结构 | `server/ public/ docs/ data/ scripts/` 齐全 |
| 4 | 代码可构建 | 新克隆一份执行 `npm install && npm start` 能打开页面 |
| 5 | README | 在 GitHub 上正常渲染，中文不乱码 |
| 6 | `node_modules` | 没被上传 |
| 7 | 隐私 | `data/contacts.json` 里没有真实个人信息 |
| 8 | PR / Release | 各至少一个，链接可访问 |
| 9 | 代码规范链接 | 在博客里点开能看到 `docs/代码规范.md` 内容 |
| 10 | 公网链接 | 用手机流量 / 无痕窗口打开，不是 localhost |

---

## 7. 常见报错速查

| 报错 | 原因 / 处理 |
| --- | --- |
| `git 不是内部或外部命令` | 本机没有系统 Git，用方案 A；或按第 3 节装到 `D:\Git` 后重开终端 |
| `'npm' 不是内部命令` | 用 `start.bat` 启动，不要在普通 CMD 里敲 npm |
| 中文文件名显示成 `\344\273\243...` | `git config --global core.quotepath false` |
| `src refspec main does not match any` | 还没 commit，先完成至少一次提交 |
| push 被拒 / 403 | 未登录或远程已有内容：先在 Desktop 登录；命令行用 `git pull --rebase origin main` 后再 push |
| `Everything up-to-date` 但网页没变化 | 提交后忘了 `Push origin`（Desktop 里要手动点） |
| 提交作者全是同一个人 | 队友没在 `Options → Git` 里改自己的 Name / Email |
| 仓库里出现 `node_modules` | `.gitignore` 丢失或未生效，检查文件是否存在于仓库根目录 |
| 博客链接点开 404 | 仓库是 Private 或链接复制成了本地路径 |

---

## 8. 诚信与隐私提醒

- commit 记录、截图、视频、PSP 时间、贡献比应按**真实情况**填写；本项目只提供模板与操作步骤，不代做也不伪造任何佐证材料。
- Public 仓库里的 `data/contacts.json` 属于公开数据，只放演示信息。
- 不要把 token、密码、`.env`、真实通讯录上传到仓库。
- CSDN 博客发布后**需要审核**，原帖明确提醒提前发布。建议 11 月 16 日当天就发，别卡在 17 日 23:59。

---

## 9. 建议的时间顺序（现在 11/16）

1. 现在：按第 2 节完成上传 + 3 次提交 → 拿仓库链接
2. 接着：邀请队友做一次真实提交 → PR → Release → 截 commit 历史
3. 然后：按 `docs/测试与演示清单.md` 截图 + 录 2–3 分钟完整演示视频
4. 最后：把链接、截图、视频、PSP 表填进 `docs/博客模板.md`，**两人各自发布一篇**个人博客并提交链接
