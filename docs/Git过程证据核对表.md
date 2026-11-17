# Git 过程证据核对表（PR / Release / commit）

> 用途：记录原帖对 Git 协作过程的**硬性要求**与仓库**当前真实状态**，分清哪些已满足、哪些必须补。
> 核对时间：**2026-11-17 15:16**；**15:51 更新**（PR #1 已合并，见下方状态表）；作业截止 **2026-11-17 23:59**。
> 原则：**commit、PR、Release 必须真实产生，不能伪造截图或数字。**

---

## 一、原帖原文要求（逐字引用）

### 1. checklist 的 Deployment 小节

> **Deployment**
>
> - **Release a version and initiate a pull request.**
> - Write a blog and submit it prior to the deadline.
>   - Include an assignment description and table of contents.
>   - Check against the grading rubric.

⚠️ 注意：这里的 **Deployment 指的是「打 Release + 发起 PR」的过程要求**，不是 1.4 节的云部署加分项，两者不是一回事。

### 2. 作业内容（Homewok Content）中的要求

> Establish a GitHub repository (**commit times ≥ 3**) and upload relevant programs and documents before the deadline.

> The purpose of this assignment is for **every student to participate in coding and experience the development process**. In collaborative work, students should communicate and divide tasks accordingly.

> For a two-person team, the members may share one Markdown document when preparing the content, but **both students must submit their own blogs**.

### 3. 博客必须包含的内容

> - Screenshots of the **GitHub commit history** and a **count of commits by each contributor**.
> - Project address (GitHub repository address, access address if applicable, and other relevant links).

**归纳为一句话**：仓库要 ≥3 次提交且**两人都要有真实提交**；要有**一次 Pull Request** 和**一个 Release 版本**；博客要放 commit 历史截图并写明每人提交数。

---

## 二、当前真实状态（已用 GitHub API 核对）

| 项目 | 原帖要求 | 当前状态（15:51 更新） | 结论 |
| --- | --- | --- | --- |
| GitHub 仓库 | Public、可 build | `https://github.com/coisiniand/address-book`（Public） | ✅ 已满足 |
| commit 次数 | ≥ 3 | **5 次**（`12ec43c`、`549d252`、`82ea01d`、`8feff3d`、`22bc7ab`） | ✅ 次数满足 |
| 提交作者 | 两人都要有 | **5 次全部是 `coisiniand`**，队友 `YXZ-520` 0 次 | ❌ **必须补** |
| Pull Request | 至少发起一次 | ✅ **PR #1 已发起并合并**（`Merged`，2026-11-17 07:51 UTC） | ✅ 已满足 |
| Release / Tag | 发布一个版本 | **0 个 Release、0 个 Tag** | ❌ **必须补** |
| 协作者 | 两人协作 | ✅ 队友 `YXZ-520` 已是 Collaborator（write 权限） | ✅ 已满足 |
| commit 历史截图 | 博客要放 | 尚未截（现在有 5 次提交，可截） | ⚠️ 待截 |
| 每人提交数 | 博客要写 | 队友仍需真实提交 1 次以上，否则写法会穿帮 | ⚠️ 补完后写真实值 |

> **PR #1 说明（如实记录）**：由仓库所有者 `coisiniand` 从 `docs/blog-guides` 分支发起并合并到 `main`，内容是补充博客写作指引、PR/Release 流程文档、核对表与 12 张演示截图（21 个文件）。这是**真实的 PR**，满足原帖 "initiate a pull request" 的字面要求；但发起人与合并人都是同一人，**不构成「两人协作」的证据**。链接：`https://github.com/coisiniand/address-book/pull/1`。
> ⚠️ 注意：GitHub 不允许审批自己的 PR（"Can not approve your own pull request"），仓库所有者可直接合并，无需 Approve。

---

## 三、补齐清单（按优先级）

### 🔴 第一优先：让队友产生真实提交 + 一次 PR

这是**两人共同开发**的核心证据，也是博客「每人提交数」能写真实数字的前提。

1. 仓库 `Settings → Collaborators → Add people`，邀请队友的 GitHub 账号，等他接受（否则他 push 会被拒 403）。
2. 队友用 GitHub Desktop 登录**自己的账号**，先在 `Options → Git` 填**自己的 Name / Email**（不填的话提交全算到 `coisiniand` 名下）。
3. 队友 clone 仓库到自己电脑，建分支 `feat/ui-polish`，做一个**真实的小改动**（如调整 `public/css/styles.css` 主色、或补一句文档），Commit → Push。
4. 队友在网页发起 **Pull request**（base `main` ← compare `feat/ui-polish`），你 **Review → Merge**，保留 `Merged` 状态的 PR 页面截图。
5. 核对：GitHub 提交历史里出现**两个人的名字和头像**；记录下来各自的 commit 次数。

> 队友的完整操作步骤见 `docs/给队友的操作指引.md`。PR 必须由队友的真实改动产生，不要自己开一个小号造 PR。

### 🟠 第二优先：发布一个 Release `v1.0.0`

这一步你自己就能做，约 1 分钟：

1. GitHub 仓库页面右侧 → **Releases** → **Create a new release**（或打开 `https://github.com/coisiniand/address-book/releases/new`）。
2. **Choose a tag** → 输入 `v1.0.0` → 回车（网页会直接用 main 的最新提交创建 tag）。
3. Release title 填 `v1.0.0`，描述写本次交付内容，例如：
   ```
   通讯录应用首版：收藏联系人、多种联系方式、Excel 导入导出、页面样式、云端部署。
   ```
4. 点 **Publish release**。
5. 复制 Release 的浏览器地址栏 URL，填进博客第 1 节。

### 🟡 第三优先：截图 + 写进博客

- **commit 历史截图**：仓库首页点 `N commits` → 截图，确保**两人名字都在**，放博客第 2 节。
- **PR 截图**：PR 页面显示 `Merged`，放第 2 节。
- **Release 截图**：Release 页面，放第 2 节。
- **提交数**：把博客第 2 节「成员 B」那行改成队友真实的 commit 次数与模块。
- **链接**：博客第 1 节的 `{{Release 链接}}`、`{{PR 链接}}` 换成真实 URL。

---

## 四、博客里对应位置速查

| 证据 | 模板位置 | 字段 |
| --- | --- | --- |
| 仓库 / 代码规范 / 公网地址 | `docs/博客模板.md` 第 1 节 | 已填好，核对即可 |
| Release / PR 链接 | 第 1 节 | `{{把 Release 与 PR 的网页地址粘到这里…}}` |
| commit 历史截图 | 第 2 节 | `{{插入 GitHub commit 历史截图}}` |
| PR / Release 截图 | 第 2 节 | `{{插入 PR 页面截图、Release 页面截图}}` |
| 两人提交数 | 第 2 节 | 成员 A 已写 3 次；成员 B 需填真实值 |

---

## 五、诚信提醒

- PR 必须是**队友真实改动**产生的，Release 必须是你**真实发布**的，截图用真实页面。
- 不要为了凑数字造多个小提交、不要用小号冒充队友、不要 P 图改提交历史。
- 时间够用的情况下，把 PR 和 Release 都做出来；如果实在来不及，至少如实说明情况，比伪造安全得多。

> 本文件只记录要求、状态与操作步骤，不代做任何 GitHub 操作，也不伪造任何记录。
