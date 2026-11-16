'use strict';

const ExcelJS = require('exceljs');
const config = require('../config');
const {
  METHOD_TYPES, LABEL_OF, HEADER_TO_FIELD, HEADER_TO_TYPE,
  normalizeHeader, toBool, toDateString, splitTags,
} = require('./validate');

/** 固定列：每个联系人占一行，每类基本信息各占一列 */
const FIXED_COLUMNS = [
  { field: 'name', header: '姓名', width: 16, required: true },
  { field: 'bookmarked', header: '收藏', width: 9 },
  { field: 'company', header: '公司', width: 20 },
  { field: 'department', header: '部门', width: 15 },
  { field: 'title', header: '职位', width: 16 },
  { field: 'birthday', header: '生日', width: 14 },
  { field: 'tags', header: '标签', width: 20 },
  { field: 'note', header: '备注', width: 32 },
];

const HEADER_FILL = 'FF2F5597';
const STRIPE_FILL = 'FFF4F7FC';

/**
 * 计算动态联系方式列：
 * 同一类型有多条时，自动扩展为「手机」「手机2」「手机3」……
 * 保证"每个联系人一行、每类信息一列"，同时不丢失多联系方式。
 */
function methodColumns(contacts) {
  const maxCount = new Map(METHOD_TYPES.map((t) => [t.value, 1]));
  for (const c of contacts) {
    const count = new Map();
    for (const m of c.contactMethods || []) count.set(m.type, (count.get(m.type) || 0) + 1);
    for (const [type, n] of count) maxCount.set(type, Math.max(maxCount.get(type) || 1, n));
  }
  const cols = [];
  for (const type of METHOD_TYPES) {
    const n = maxCount.get(type.value) || 1;
    for (let i = 1; i <= n; i += 1) {
      cols.push({
        kind: 'method',
        type: type.value,
        header: i === 1 ? type.label : `${type.label}${i}`,
        width: i === 1 && type.value === 'address' ? 34 : 22,
      });
    }
  }
  return cols;
}

function allColumns(contacts) {
  return [
    ...FIXED_COLUMNS.map((c) => ({ ...c, kind: 'field' })),
    ...methodColumns(contacts),
  ];
}

/** 表头样式。注意：不要用 getRow() 预先访问尚不存在的行，ExcelJS 会把它创建成空行 */
function styleSheet(sheet, columns) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.header, width: c.width }));
  const header = sheet.getRow(1);
  header.height = 26;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF1F3A6E' } } };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

/** 数据写入完成后再美化：eachRow 只遍历真实存在的行，不会制造空行 */
function styleBody(sheet) {
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.alignment = { vertical: 'middle' };
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_FILL } };
      });
    }
  });
}

function addReadmeSheet(workbook, columns, title = '字段说明') {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: '列名', key: 'col', width: 20 },
    { header: '含义 / 填写说明', key: 'desc', width: 62 },
    { header: '示例', key: 'example', width: 30 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 24;
  const desc = {
    name: '必填。联系人姓名，作为一行记录的标识',
    bookmarked: '填「是 / 否」或 true / false；填「是」即收藏（书签）联系人',
    company: '公司 / 单位', department: '所属部门', title: '职位 / 职务',
    birthday: '生日，建议 YYYY-MM-DD', tags: '多个标签用逗号、顿号或分号分隔',
    note: '备注文本',
  };
  const example = {
    name: '林晓', bookmarked: '是', company: '星海科技', department: '研发部',
    title: '工程师', birthday: '2001-05-12', tags: '同学,福州', note: '结对编程队友',
  };
  for (const c of columns) {
    if (c.kind === 'field') {
      sheet.addRow({ col: c.header, desc: desc[c.field] || '', example: example[c.field] || '' });
    }
  }
  sheet.addRow({ col: '手机 / 邮箱 / 微信 …', desc: '每种联系方式各占一列；同一类型有多条时，新增「手机2」「邮箱2」等同前缀列即可，导入会自动识别', example: '13800000000' });
  sheet.addRow({ col: '扩展规则', desc: '列名可带序号（如「手机3」），也可使用中英文别名（如 Phone、E-mail）；未识别的列会被忽略', example: '' });
  sheet.addRow({ col: '工作表', desc: '导入只读取名为「联系人」的工作表；若不存在则读取第一个工作表', example: '' });
  sheet.eachRow((row, i) => { if (i > 1) row.alignment = { vertical: 'middle', wrapText: true }; });
}

/** 生成导出工作簿 */
function buildWorkbook(contacts) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EE308FZ Address Book';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('联系人');
  const columns = allColumns(contacts);
  styleSheet(sheet, columns);

  for (const c of contacts) {
    const byType = new Map();
    for (const m of c.contactMethods || []) {
      if (!byType.has(m.type)) byType.set(m.type, []);
      byType.get(m.type).push(m.value);
    }
    const row = {};
    row['姓名'] = c.name;
    row['收藏'] = c.bookmarked ? '是' : '否';
    row['公司'] = c.company || '';
    row['部门'] = c.department || '';
    row['职位'] = c.title || '';
    row['生日'] = c.birthday || '';
    row['标签'] = (c.tags || []).join('、');
    row['备注'] = c.note || '';
    const used = new Map();
    for (const col of columns) {
      if (col.kind !== 'method') continue;
      const idx = used.get(col.type) || 0;
      const values = byType.get(col.type) || [];
      row[col.header] = values[idx] || '';
      used.set(col.type, idx + 1);
    }
    sheet.addRow(row);
  }
  styleBody(sheet);
  addReadmeSheet(workbook, columns);
  return workbook;
}

/** 生成可下载的标准模板（含 2 行示例） */
function buildTemplateWorkbook() {
  const sample = [
    {
      name: '林晓', bookmarked: true, company: '星海科技', department: '研发部', title: '前端工程师',
      birthday: '2003-05-12', tags: ['同学', '队友'], note: '结对编程搭档',
      contactMethods: [
        { type: 'phone', value: '13800001111' }, { type: 'phone', value: '13900002222' },
        { type: 'email', value: 'linxiao@example.com' }, { type: 'wechat', value: 'linxiao_dev' },
        { type: 'address', value: '福建省福州市闽侯县' },
      ],
    },
    {
      name: '陈一', bookmarked: false, company: '福州大学', department: '软件工程系', title: '助教',
      birthday: '', tags: ['老师'], note: '',
      contactMethods: [{ type: 'email', value: 'chenyi@example.com' }, { type: 'tel', value: '0591-22860000' }],
    },
  ];
  const workbook = buildWorkbook(sample);
  workbook.getWorksheet('字段说明').name = '填写说明';
  return workbook;
}

/** 单元格值 -> 纯文本（兼容富文本、公式、超链接、日期） */
function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return toDateString(value);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text || '').join('');
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined && value.result !== null) return String(value.result);
    if (value.hyperlink) return String(value.hyperlink);
    if (value.error) return '';
    return '';
  }
  return String(value);
}

/** 从「联系方式」这类混合列里推断类型 */
function guessType(value) {
  const v = value.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'email';
  if (/^1[3-9]\d{9}$/.test(v)) return 'phone';
  if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) return 'website';
  if (/^\d{7,12}(-\d+)?$/.test(v)) return 'tel';
  return 'other';
}

/**
 * 解析上传的 Excel，返回未落库的联系人数组 + 警告信息（用于前端预览）。
 * 不会修改数据文件。
 */
async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets = workbook.worksheets.filter((s) => !['字段说明', '填写说明', '说明', 'readme'].includes(s.name));
  const sheet = workbook.getWorksheet('联系人') || sheets[0] || workbook.worksheets[0];
  if (!sheet) throw new Error('Excel 文件中没有工作表');

  if (sheet.rowCount > config.MAX_ROWS + 1) {
    throw new Error(`行数超过上限 ${config.MAX_ROWS}，请拆分文件后再导入`);
  }

  const headerRow = sheet.getRow(1);
  const columns = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = cellText(cell.value).trim();
    const key = normalizeHeader(header);
    if (!header) { columns.push({ index: colNumber, header: '', kind: 'ignore' }); return; }
    const field = HEADER_TO_FIELD.get(key);
    const type = HEADER_TO_TYPE.get(key);
    if (field) columns.push({ index: colNumber, header, kind: 'field', field });
    else if (type) columns.push({ index: colNumber, header, kind: 'method', type, label: header });
    else if (/^(联系方式|联系方法|contactmethods?)$/.test(key)) columns.push({ index: colNumber, header, kind: 'mixed' });
    else columns.push({ index: colNumber, header, kind: 'ignore' });
  });

  if (!columns.some((c) => c.kind === 'field' && c.field === 'name')) {
    throw new Error('未找到「姓名」列：请使用标准模板，或把第一行第一列命名为「姓名」');
  }

  const contacts = [];
  const warnings = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const raw = { contactMethods: [] };
    let filled = 0;
    for (const col of columns) {
      const text = cellText(row.getCell(col.index).value).trim();
      if (!text) continue;
      filled += 1;
      if (col.kind === 'field') {
        if (col.field === 'tags') raw.tags = splitTags(text);
        else if (col.field === 'bookmarked') raw.bookmarked = toBool(text);
        else if (col.field === 'birthday') raw.birthday = toDateString(text);
        else raw[col.field] = text;
      } else if (col.kind === 'method') {
        raw.contactMethods.push({ type: col.type, label: col.label, value: text });
      } else if (col.kind === 'mixed') {
        for (const part of text.split(/[;；|\r\n]+/).map((s) => s.trim()).filter(Boolean)) {
          const type = guessType(part);
          raw.contactMethods.push({ type, label: LABEL_OF[type], value: part });
        }
      }
    }
    if (!filled) continue;
    if (!String(raw.name || '').trim()) {
      warnings.push({ row: r, reason: '姓名为空，已跳过该行' });
      continue;
    }
    contacts.push(raw);
  }

  return {
    sheetName: sheet.name,
    contacts,
    warnings,
    mappedColumns: columns.filter((c) => c.kind !== 'ignore').map((c) => ({ header: c.header, kind: c.kind, field: c.field || c.type || '' })),
    ignoredColumns: columns.filter((c) => c.kind === 'ignore' && c.header).map((c) => c.header),
    rowCount: sheet.rowCount - 1,
  };
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function exportFileName() { return `通讯录_${timestamp()}.xlsx`; }
function templateFileName() { return '通讯录导入模板.xlsx'; }

function sendWorkbook(res, workbook, fileName) {
  return workbook.xlsx.writeBuffer().then((buf) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      `attachment; filename="address-book-${timestamp()}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(buf));
  });
}

module.exports = {
  buildWorkbook,
  buildTemplateWorkbook,
  parseWorkbook,
  sendWorkbook,
  exportFileName,
  templateFileName,
};
