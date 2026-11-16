# API 接口文档

- 基地址：`http://<host>:<port>/api`
- 所有接口返回 JSON（Excel 下载接口除外），统一结构：

```json
{ "code": 0, "message": "ok", "data": { } }
```

失败时 `code` 非 0、`data` 为 `null`，`message` 为可直接展示给用户的中文错误提示。

| HTTP 状态 | 含义 |
| --- | --- |
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数/文件错误 |
| 404 | 资源或接口不存在 |
| 422 | 数据校验失败 |
| 500 | 服务端异常 |

---

## 数据模型

### Contact

```json
{
  "id": "c-1001",
  "name": "林晓",
  "company": "星海科技",
  "department": "研发部",
  "title": "前端工程师",
  "birthday": "2003-05-12",
  "tags": ["队友", "同学"],
  "note": "结对编程搭档",
  "bookmarked": true,
  "contactMethods": [
    { "id": "m-1001a", "type": "phone", "label": "手机", "value": "13800001111", "primary": true },
    { "id": "m-1001b", "type": "email", "label": "邮箱", "value": "linxiao@example.com", "primary": false }
  ],
  "createdAt": "2026-11-10T02:11:00.000Z",
  "updatedAt": "2026-11-15T07:42:00.000Z"
}
```

`contactMethods[].type` 取值：`phone` `tel` `email` `wechat` `qq` `weibo` `linkedin` `social` `address` `website` `other`。

---

## 联系人接口

### GET /api/contacts

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | string | 模糊匹配姓名、公司、部门、职位、备注、标签及所有联系方式的值 |
| `bookmarked` | boolean | `true` 时只返回收藏联系人 |
| `tag` | string | 按标签精确筛选 |
| `sort` | string | `updated`(默认) / `created` / `name` / `bookmark` |
| `page` | number | 页码，从 1 开始 |
| `pageSize` | number | 每页条数，默认 12，最大 200 |

响应：

```json
{ "code": 0, "message": "ok", "data": { "items": [ /* Contact[] */ ], "total": 10, "page": 1, "pageSize": 12 } }
```

### POST /api/contacts

请求体（仅 `name` 必填）：

```json
{
  "name": "林晓",
  "company": "星海科技",
  "tags": ["队友", "同学"],
  "bookmarked": true,
  "contactMethods": [
    { "type": "phone", "label": "手机", "value": "13800001111", "primary": true },
    { "type": "email", "value": "linxiao@example.com" }
  ]
}
```

`tags` 也可以传字符串 `"队友,同学"`；`label` 留空时自动使用类型默认名称；`primary` 未指定时自动把第一条设为主要。

### GET /api/contacts/:id · PUT /api/contacts/:id · DELETE /api/contacts/:id

`PUT` 为全量更新，未传的字段会被清空，因此前端编辑表单会提交完整字段。

### PATCH /api/contacts/:id/bookmark

```json
{ "bookmarked": true }
```

不传 `bookmarked` 时对当前状态取反。返回更新后的 Contact。

### POST /api/contacts/bulk

```json
{ "ids": ["c-1001", "c-1002"], "action": "bookmark" }
```

`action`：`bookmark` / `unbookmark` / `delete`。返回 `{ "affected": 2 }`。

### GET /api/contacts/tags · GET /api/contacts/stats

```json
// tags
[{ "name": "同学", "count": 3 }]
// stats
{ "total": 10, "bookmarked": 4, "methods": 27, "tags": 8 }
```

---

## Excel 接口

### GET /api/excel/export

可携带与列表接口相同的 `keyword` / `bookmarked` / `tag` / `sort` 参数，实现「导出当前筛选结果」。返回 `.xlsx` 二进制，响应头 `Content-Disposition: attachment` 带 UTF-8 中文文件名。

**导出列**：`姓名 | 收藏 | 公司 | 部门 | 职位 | 生日 | 标签 | 备注 | 手机 | 手机2 … | 座机 | 邮箱 …`

同类型联系方式按最大条数自动扩展序号列；另有「字段说明」工作表。

### GET /api/excel/template

返回标准模板：`联系人` 工作表（表头 + 2 行示例）与 `填写说明` 工作表。

### POST /api/excel/preview

`multipart/form-data`，字段名 `file`，仅接受 `.xlsx`，上限 5MB。**不写库**。

响应 `data`：

```json
{
  "sheetName": "联系人",
  "fileName": "同学录.xlsx",
  "size": 8192,
  "rowCount": 12,
  "contacts": [ /* 未落库的 Contact 形状数组 */ ],
  "warnings": [{ "row": 5, "reason": "姓名为空，已跳过该行" }],
  "mappedColumns": [{ "header": "手机", "kind": "method", "field": "phone" }],
  "ignoredColumns": ["学号"]
}
```

### POST /api/excel/commit

```json
{
  "contacts": [ /* preview 返回的 contacts，可裁剪 */ ],
  "duplicate": "append"
}
```

`duplicate`：`append`（全部新增）/ `merge`（按姓名合并，联系方式按 type+value 去重）/ `skip`（跳过同名）。

```json
{
  "code": 0,
  "message": "导入完成：新增 12，更新 0，跳过 1",
  "data": { "total": 13, "created": 12, "updated": 0, "skipped": 1, "errors": [] }
}
```

### GET /api/health

```json
{ "code": 0, "message": "ok", "data": { "name": "ee308fz-address-book", "version": "1.0.0", "time": "..." } }
```

---

## 表头别名（导入时自动识别）

| 字段 | 可识别的表头 |
| --- | --- |
| 姓名 | 姓名、名字、联系人、名称、Name、Full Name |
| 收藏 | 收藏、是否收藏、星标、书签、加星、Favorite、Bookmark |
| 公司 | 公司、公司名称、单位、Company |
| 部门 | 部门、所属部门、Department |
| 职位 | 职位、职务、岗位、Title |
| 生日 | 生日、出生日期、Birthday |
| 标签 | 标签、分组、分类（多个用 `,` `、` `;` 分隔） |
| 备注 | 备注、说明、Note、Remark |
| 联系方式 | 手机/手机号/移动电话/联系电话/电话/Phone/Mobile、座机/固话、邮箱/E-mail、微信、QQ、微博、领英/社交账号、地址、网站、其他；以及带序号的 `手机2`、`邮箱3` |
| 混合列 | `联系方式`、`联系方法`，用 `;` `|` 换行分隔，自动判断邮箱/手机/电话/网址 |

规则：忽略大小写、空格、下划线、括号内容和列名末尾的数字序号；未识别的列会被忽略并在预览中列出。只读取名为「联系人」的工作表（不存在则取第一个非说明工作表）。
