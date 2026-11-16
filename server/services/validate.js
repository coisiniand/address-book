'use strict';

const { randomUUID } = require('crypto');

/** 联系方式类型表：前后端、Excel 列名共用同一份定义 */
const METHOD_TYPES = [
  { value: 'phone', label: '手机', aliases: ['手机', '手机号', '移动电话', '联系电话', '电话', '手机号码', 'phone', 'mobile', 'tel'] },
  { value: 'tel', label: '座机', aliases: ['座机', '固话', '固定电话', '工作电话', 'landline'] },
  { value: 'email', label: '邮箱', aliases: ['邮箱', '电子邮箱', '电子邮件', '邮件', 'e-mail', 'email', 'mail'] },
  { value: 'wechat', label: '微信', aliases: ['微信', '微信号', 'wechat', 'weixin'] },
  { value: 'qq', label: 'QQ', aliases: ['qq', 'qq号'] },
  { value: 'weibo', label: '微博', aliases: ['微博', '新浪微博', 'weibo'] },
  { value: 'linkedin', label: '领英', aliases: ['领英', 'linkedin'] },
  { value: 'social', label: '社交账号', aliases: ['社交账号', '社交平台', '其他社交', 'social'] },
  { value: 'address', label: '地址', aliases: ['地址', '联系地址', '邮寄地址', '住址', 'address'] },
  { value: 'website', label: '网站', aliases: ['网站', '主页', '个人网站', '博客', 'website', 'url'] },
  { value: 'other', label: '其他', aliases: ['其他', '其它', '备注联系方式', 'other'] },
];

const TYPE_SET = new Set(METHOD_TYPES.map((t) => t.value));
const LABEL_OF = Object.fromEntries(METHOD_TYPES.map((t) => [t.value, t.label]));

/** 表头 -> 联系方式类型。去空格、去全半角括号内容、去数字序号后缀 */
function normalizeHeader(raw) {
  return String(raw ?? '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s_\-·:：/\\]/g, '')
    .replace(/[0-9０-９]+$/g, '')
    .toLowerCase();
}

const HEADER_TO_TYPE = new Map();
for (const type of METHOD_TYPES) {
  for (const alias of type.aliases) HEADER_TO_TYPE.set(normalizeHeader(alias), type.value);
}

/** 固定字段的表头别名 */
const FIELD_ALIASES = {
  name: ['姓名', '名字', '联系人', '联系人姓名', '名称', 'name', 'fullname', 'contact'],
  company: ['公司', '公司名称', '单位', '企业', 'company', 'organization'],
  department: ['部门', '所属部门', 'department', 'dept'],
  title: ['职位', '职务', '岗位', '头衔', 'title', 'jobtitle'],
  birthday: ['生日', '出生日期', '出生年月', 'birthday', 'birthdate'],
  tags: ['标签', '分组', '分类', '组别', 'tags', 'tag', 'group'],
  note: ['备注', '说明', '描述', 'note', 'remark', 'memo'],
  bookmarked: ['收藏', '是否收藏', '星标', '书签', '加星', '收藏夹', 'favorite', 'bookmark', 'starred'],
};
const HEADER_TO_FIELD = new Map();
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) HEADER_TO_FIELD.set(normalizeHeader(alias), field);
}

const TRUTHY = new Set(['1', 'y', 'yes', 'true', '是', '√', '✓', '★', '*', '已收藏', '收藏']);

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return TRUTHY.has(String(value ?? '').trim().toLowerCase());
}

/** Excel 单元格里的日期可能是 Date / 序列号 / 字符串，统一成 YYYY-MM-DD */
function toDateString(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}`;
  }
  const text = String(value).trim();
  const m = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return text.slice(0, 20);
}

function splitTags(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? '')
    .split(/[,，、;；|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 把任意输入清洗成合法的联系方式数组 */
function sanitizeMethods(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const item of input) {
    if (!item) continue;
    const value = String(item.value ?? '').trim();
    if (!value) continue;
    const type = TYPE_SET.has(item.type) ? item.type : 'other';
    out.push({
      id: String(item.id || randomUUID()),
      type,
      label: String(item.label || LABEL_OF[type] || '其他').trim().slice(0, 30),
      value: value.slice(0, 200),
      primary: Boolean(item.primary),
    });
  }
  // 至多保留一个"主要联系方式"
  let seenPrimary = false;
  for (const m of out) {
    if (m.primary && seenPrimary) m.primary = false;
    if (m.primary) seenPrimary = true;
  }
  if (!seenPrimary && out.length) out[0].primary = true;
  return out.slice(0, 50);
}

/**
 * 校验并规范化联系人。
 * @returns {{ contact: object|null, errors: string[] }}
 */
function sanitizeContact(input, { existing = null, requireName = true } = {}) {
  const errors = [];
  const src = input && typeof input === 'object' ? input : {};
  const base = existing ? { ...existing } : {};

  const name = String(src.name ?? base.name ?? '').trim();
  if (requireName && !name) errors.push('姓名不能为空');
  if (name.length > 40) errors.push('姓名不能超过 40 个字符');

  const contact = {
    ...base,
    id: base.id || randomUUID(),
    name,
    company: String(src.company ?? base.company ?? '').trim().slice(0, 80),
    department: String(src.department ?? base.department ?? '').trim().slice(0, 80),
    title: String(src.title ?? base.title ?? '').trim().slice(0, 80),
    birthday: toDateString(src.birthday ?? base.birthday ?? ''),
    tags: src.tags !== undefined ? [...new Set(splitTags(src.tags))].slice(0, 20) : base.tags || [],
    note: String(src.note ?? base.note ?? '').trim().slice(0, 1000),
    bookmarked: src.bookmarked !== undefined ? toBool(src.bookmarked) : Boolean(base.bookmarked),
    contactMethods: src.contactMethods !== undefined
      ? sanitizeMethods(src.contactMethods)
      : sanitizeMethods(base.contactMethods || []),
    createdAt: base.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { contact: errors.length ? null : contact, errors };
}

module.exports = {
  METHOD_TYPES,
  LABEL_OF,
  TYPE_SET,
  HEADER_TO_TYPE,
  HEADER_TO_FIELD,
  normalizeHeader,
  toBool,
  toDateString,
  splitTags,
  sanitizeMethods,
  sanitizeContact,
};
