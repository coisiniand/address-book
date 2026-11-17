# PR 与 Release 双人完整操作手册（EE308FZ 通讯录）

> 目的：原帖硬性要求 **发起一次 Pull Request** 和 **发布一个 Release**，且**两人都要有真实提交**。
> 这份手册把「你（仓库主，成员 A）」和「队友（成员 B）」各自要做的事分清楚，两人各照自己那部分做即可。
> 仓库：`https://github.com/coisiniand/address-book`（Public，当前只有 `main` 分支、3 次提交全是你的）
> 截止：**2026-11-17 23:59**。全部操作今天完成。
> ⚠️ 所有 commit / PR / Release 必须真实产生，本手册不代做、不伪造。

---

## 全流程一览（谁在什么时候做什么）

| 阶段 | 你（仓库主 / 成员 A） | 队友（成员 B） |
| --- | --- | --- |
| ① 邀请协作 | **邀请队友成为 Collaborator** | 接受邮件邀请 |
| ② 本地准备 | — | 登录 GitHub Desktop、改成自己的 Name/Email、clone 仓库 |
| ③ 真实提交 | — | 建分支 → 做小改动 → Commit → Push |
| ④ 发起 PR | — | 网页上 `Create pull request` |
| ⑤ Review 合并 | `Review` → `Merge pull request` | 等合并、截图 |
| ⑥ 发布 Release | 建 `v1.0.0` Release | 拿链接、截图 |
| ⑦ 写博客 | 用 `博客模板.md`，成员 A 视角 | 用 `博客模板.md`，成员 B 视角 |

---

## ① 你：邀请队友成为协作者（必须先做）

不邀请，队友 push 会被拒（403），后面全卡住。

1. 浏览器打开 `https://github.com/coisiniand/address-book`
2. 顶部菜单 **Settings** → 左侧 **Collaborators** → **Add people**
3. 输入队友的 **GitHub 用户名或注册邮箱** → 选中 → **Add <用户名> to this repository**
4. 队友的邮箱会收到一封邀请邮件，让他**点 Accept invitation**（没有邮件就去 GitHub 通知里看）
5. 接受后，队友刷新仓库页面，确认自己能看到了

> 只有加了 Collaborator，队友才能往这个仓库 push。仓库是 Public 不代表别人能写。

---

## ② 队友：本地准备（约 7 分钟）

### 2.1 登录 GitHub Desktop

1. 装好 GitHub Desktop（<https://desktop.github.com/>，一路默认）
2. `File → Options → Accounts → Sign in to GitHub.com` → 用**队友自己的 GitHub 账号**在浏览器授权登录

> 队友没有 GitHub 账号？先去 <https://github.com/signup> 注册一个（用户名、邮箱、密码），回来再登录。

### 2.2 改成队友自己的 Git 身份（⚠️ 最关键，先做）

**不改这一步，提交会算到你（仓库主）名下，博客里的「每人提交数」就穿帮。**

`File → Options → Git` → 把 **Name** 填队友的 GitHub 用户名、**Email** 填他 GitHub 账号绑定的邮箱 → 保存。

命令行版（队友电脑有 Git 才用）：

```powershell
git config user.name "队友的GitHub用户名"
git config user.email "队友的绑定邮箱"
git config core.quotepath false
```

验证输出确实是队友自己的名字邮箱再继续。

### 2.3 clone 仓库到本地 D 盘

GitHub Desktop：`File → Clone repository…` → `URL` 页签 → 粘贴：

```
https://github.com/coisiniand/address-book.git
```

本地路径选 **D 盘**（如 `D:\EE308FZ\address-book-teammate`，别和你本地那份撞在同一个文件夹）。点 **Clone**。

命令行版：

```powershell
cd D:\EE308FZ
git clone https://github.com/coisiniand/address-book.git address-book-teammate
cd address-book-teammate
```

看到 `server\`、`public\`、`docs\`、`README.md` 就成功。`node_modules` 不在里面是正常的，队友要做的是文档/样式小改动，不需要装依赖。

---

## ③ 队友：建分支 + 真实改动 + 提交（约 10 分钟）

**为什么要建分支**：PR 的本质是「从一个分支合并到另一个分支」。队友在独立分支上改，才能发起一次真正有意义的 PR，你再 Review 合并回 `main`。

### 3.1 新建分支

GitHub Desktop 顶部 `Branch → New branch`，名字填 `feat/ui-polish`，基于 `main` 创建。

命令行版：

```powershell
git checkout -b feat/ui-polish
```

### 3.2 做一个真实、不破坏功能的小改动（三选一）

- **改样式主色**：`public/css/styles.css` 里把主色变量换一个色号（如 `#2F5597` → `#2E7D5B`）
- **补一句文档**：`README.md` 加一句「本文档由结对成员共同维护」
- **改错别字**：`docs/` 里找一处表述改准确

> 用记事本/VS Code 改都行，改完保存。别动 `data/contacts.json` 和接口逻辑，避免和线上不一致。

### 3.3 Commit + Push

GitHub Desktop：左侧 `Changes` 勾选改的文件 → Summary 填 `style: adjust primary color`（或按改动选 `docs: clarify readme`）→ `Commit to main` 的按钮此时会显示 `Commit to feat/ui-polish` → 点它 → 再点顶部 **`Push origin`**（新分支首次推送可能显示 `Publish branch`，点它）。

命令行版：

```powershell
git add public/css/styles.css
git commit -m "style: adjust primary color"
git push -u origin feat/ui-polish
```

**验证**：浏览器刷新仓库 → 分支下拉框里能看到 `feat/ui-polish`，且页面出现黄色提示条 `Compare & pull request`。

---

## ④ 队友：发起 Pull Request（约 3 分钟）

1. 打开 `https://github.com/coisiniand/address-book`
2. 黄色提示条点 **`Compare & pull request`**（没看到就点顶部 **Pull requests → New pull request**，base 选 `main`、compare 选 `feat/ui-polish`）
3. 标题填 `feat: UI polish from teammate`
4. 说明写：`调整主题配色并补充文档说明，请 Review 后合并。`
5. 点 **`Create pull request`**
6. 把 PR 页面的**地址栏 URL 复制下来**（形如 `https://github.com/coisiniand/address-book/pull/1`），发给队友/你自己，博客要用

---

## ⑤ 你：Review 并合并 PR（约 3 分钟）

1. 打开队友发来的 PR 链接（或仓库 **Pull requests** 标签页）
2. 点 **Files changed** 看一眼改动，确认是那处样式/文档
3. 点 **Review changes → Approve → Submit review**（角色扮到位，截图更有说服力）
4. 点绿色 **`Merge pull request`** → **`Confirm merge`**
5. **截图 PR 页面**：要让 `Merged` 状态、PR 编号、两人对话都露出来，放进博客第 2 节
6. 合并后可选：点 **Delete branch** 删掉 `feat/ui-polish`（保持整洁）

**验证**：仓库首页点 **`N commits`**，现在应有 **4 次以上**提交，且能看到**两个人的名字/头像**。截这张图，博客第 2 节要用。

---

## ⑥ 你：发布 Release `v1.0.0`（约 2 分钟）

1. 打开 `https://github.com/coisiniand/address-book/releases/new`
   （或仓库右侧 **Releases → Create a new release**）
2. **Choose a tag** → 输入 `v1.0.0` → 回车（Tag 基于当前 `main` 最新提交创建）
3. Release title 填 `v1.0.0`
4. 描述框填：

   ```
   通讯录应用首版：收藏联系人、多种联系方式、Excel 导入导出、页面样式、云端部署。
   ```

5. 点 **`Publish release`**
6. 复制 Release 的**地址栏 URL**（形如 `https://github.com/coisiniand/address-book/releases/tag/v1.0.0`），发给队友
7. **截图 Release 页面**，放进博客第 2 节

> Release 谁建都行（你或队友），但**只能有一个人建**，建完把链接发给对方，两人博客填同一个 URL。

---

## ⑦ 证据汇总：填进博客（两人各自做）

拿到下面四样后，博客第 1、2 节就能填全：

| 证据 | 来源 | 填到博客哪 |
| --- | --- | --- |
| commit 历史截图（两人名字可见） | 步骤⑤第 6 点 | `docs/博客模板.md` 第 2 节 `{{插入 GitHub commit 历史截图}}` |
| PR 截图（`Merged` 状态） | 步骤⑤第 5 点 | 第 2 节 `{{插入 PR 页面截图…}}` |
| Release 截图 | 步骤⑥第 7 点 | 第 2 节同一行 |
| PR 链接、Release 链接 | 步骤④第 6 点、⑥第 6 点 | 第 1 节 `{{Release / PR}}` 行 |
| 各自 commit 次数 | 步骤⑤第 6 点的提交历史 | 第 2 节：你 3 次（原有）+ 队友本次 1 次以上，**按实际数** |

> 博客模板用法、占位符清单、截图清单、PSP、发布流程见：
> - 你（成员 A）：`docs/博客撰写指引.md`
> - 队友（成员 B）：`docs/给队友的操作指引.md`

---

## 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 队友 Push 被拒 / 403 | 没加 Collaborator：回到步骤①邀请，队友邮件接受后再 push |
| 提交作者还是你的名字 | 队友没改 Git 身份：步骤 2.2。已提交错了需重写历史，麻烦，务必先改 |
| `git` 不是内部命令 | 队友用 GitHub Desktop 图形界面，不用命令行 |
| Clone 要登录 | Desktop 里先 `File → Options → Accounts` 登录队友自己的账号 |
| 新建分支后没有 `Compare & pull request` | 分支还没 push，或 push 到了队友 fork 而非本仓库；确认 clone 的是 `coisiniand/address-book` 且已 `Push origin` |
| PR 里 base 不是 main | 创建 PR 时把 base 选 `main`、compare 选 `feat/ui-polish` |
| 合并后提交历史只有一个人 | 说明队友那次提交作者没改成自己，检查 `git shortlog -sne` 输出 |
| Release 已存在 | 只需一个，谁建都行，把链接发对方即可，不要重复建 |

---

## 时间建议（现在 15:24，今晚 23:59 截止，CSDN 还要审核）

1. **现在**：你做①邀请队友；等他接受的同时，你做⑥建 Release（不依赖队友）
2. **队友上线后**：他做②③④，你做⑤合并
3. **拿到四个证据后**：两人各自写博客、录视频，今天内发布并提交到课程社区

> 诚信提醒：commit、PR、Release、截图、视频、PSP、贡献比都按真实情况产生和填写。这份手册只给操作步骤，不代做、不伪造任何佐证材料。
