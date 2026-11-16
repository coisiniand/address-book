'use strict';

/**
 * 端到端冒烟测试（无需额外依赖，使用 Node 内置 fetch + exceljs）
 * 用法：先 npm start 启动服务，另开终端执行 npm test
 * 可通过 BASE_URL 指定地址：BASE_URL=http://your-server:3000 npm test
 */
const ExcelJS = require('exceljs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;

function check(condition, name, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function request(path, { method = 'GET', json, form, binary = false } = {}) {
  const opts = { method };
  if (form) opts.body = form;
  else if (json !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (binary) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()) };
  const body = await res.json();
  return { status: res.status, body };
}

function excelUpload(buffer, name = 'test.xlsx') {
  const form = new FormData();
  form.append('file', new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), name);
  return form;
}

async function loadWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

async function main() {
  console.log(`\n=== EE308FZ 通讯录 · 端到端冒烟测试 ===\n目标服务：${BASE}\n`);

  const health = await request('/api/health');
  check(health.status === 200 && health.body.code === 0, '健康检查 /api/health');

  const initial = await request('/api/contacts?pageSize=200');
  check(initial.status === 200 && Array.isArray(initial.body.data.items), '联系人列表接口', JSON.stringify(initial.body).slice(0, 120));
  const initialTotal = initial.body.data.total;
  const stats0 = await request('/api/contacts/stats');
  check(stats0.body.data.total === initialTotal, '统计接口数据一致');
  const tags = await request('/api/contacts/tags');
  check(Array.isArray(tags.body.data), '标签接口');

  // ---- CRUD 与收藏 ----
  const created = await request('/api/contacts', {
    method: 'POST',
    json: {
      name: '冒烟测试联系人',
      company: '测试公司',
      tags: ['测试', '临时'],
      bookmarked: false,
      contactMethods: [
        { type: 'phone', label: '手机', value: '13800000999', primary: true },
        { type: 'email', label: '邮箱', value: 'smoke@test.com' },
        { type: 'wechat', label: '微信', value: 'smoke_wx' },
      ],
    },
  });
  check(created.status === 201 && created.body.data.contactMethods.length === 3, '新建联系人（含 3 条联系方式）');
  const id = created.body.data.id;

  const detail = await request(`/api/contacts/${id}`);
  check(detail.body.data.name === '冒烟测试联系人', '按 id 查询详情');

  const starred = await request(`/api/contacts/${id}/bookmark`, { method: 'PATCH', json: {} });
  check(starred.body.data.bookmarked === true, '收藏（书签）切换');
  const unstarred = await request(`/api/contacts/${id}/bookmark`, { method: 'PATCH', json: { bookmarked: false } });
  check(unstarred.body.data.bookmarked === false, '取消收藏');

  const updated = await request(`/api/contacts/${id}`, {
    method: 'PUT',
    json: { name: '冒烟测试联系人', company: '测试公司', bookmarked: true, tags: '测试,临时', contactMethods: [{ type: 'phone', value: '13800000999' }, { type: 'tel', value: '0591-1234567' }] },
  });
  check(updated.body.data.contactMethods.length === 2 && updated.body.data.department === '', '全量更新联系人');
  check(updated.body.data.contactMethods[0].primary === true, '主要联系方式自动补全');

  const search = await request('/api/contacts?keyword=13800000999');
  check(search.body.data.items.some((c) => c.id === id), '按联系方式内容搜索');
  const onlyStar = await request('/api/contacts?bookmarked=true&pageSize=200');
  check(onlyStar.body.data.items.every((c) => c.bookmarked), '仅看收藏筛选');
  const tagFilter = await request('/api/contacts?tag=测试');
  check(tagFilter.body.data.items.some((c) => c.id === id), '按标签筛选');
  const sorted = await request('/api/contacts?sort=name&pageSize=200');
  const names = sorted.body.data.items.map((c) => c.name);
  check(JSON.stringify(names) === JSON.stringify([...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))), '按姓名排序');

  // ---- Excel 模板 ----
  const template = await request('/api/excel/template', { binary: true });
  check(template.status === 200 && template.buffer.slice(0, 2).toString() === 'PK', '下载导入模板（xlsx 文件）');
  const twb = await loadWorkbook(template.buffer);
  check(Boolean(twb.getWorksheet('联系人')) && Boolean(twb.getWorksheet('填写说明')), '模板包含「联系人」与「填写说明」两个工作表');
  const tplHeaders = twb.getWorksheet('联系人').getRow(1).values.map(String);
  check(tplHeaders.includes('姓名') && tplHeaders.includes('收藏') && tplHeaders.includes('手机2'), '模板表头含姓名/收藏/多联系方式列', tplHeaders.join(','));

  // ---- 构造测试 Excel：多联系方式、别名列、混合列、空姓名行 ----
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('联系人');
  ws.addRow(['姓名', '收藏', '公司', '标签', '手机', '手机2', '邮箱', '微信', '地址', '联系方式']);
  ws.addRow(['冒烟测试A', '是', '测试公司', '测试,临时', '13800000001', '13900000002', 'a@test.com', 'wx_a', '福州市', 'b@test.com;13700000003']);
  ws.addRow(['冒烟测试B', '否', '', '', '13800000004', '', '', '', '', '']);
  ws.addRow(['', '是', '无效行', '', '13500000000', '', '', '', '', '']);
  const importBuffer = Buffer.from(await wb.xlsx.writeBuffer());

  const preview = await request('/api/excel/preview', { method: 'POST', form: excelUpload(importBuffer, '导入测试.xlsx') });
  check(preview.status === 200 && preview.body.data.contacts.length === 2, 'Excel 预览解析（跳过空姓名行）', JSON.stringify(preview.body.message));
  check(preview.body.data.warnings.length === 1, '预览返回跳过原因');
  const a = preview.body.data.contacts.find((c) => c.name === '冒烟测试A');
  check(a && a.contactMethods.length === 7, '识别同类型多列 + 混合列', a ? `实际 ${a.contactMethods.length} 条` : '未找到');
  check(a && a.bookmarked === true && a.tags.length === 2, '识别收藏列与多标签');

  const c1 = await request('/api/excel/commit', { method: 'POST', json: { contacts: preview.body.data.contacts, duplicate: 'append' } });
  check(c1.body.data.created === 2, '导入提交 append 新增 2 条');
  const c2 = await request('/api/excel/commit', { method: 'POST', json: { contacts: preview.body.data.contacts, duplicate: 'skip' } });
  check(c2.body.data.skipped === 2 && c2.body.data.created === 0, '同名跳过策略 skip');
  const c3 = await request('/api/excel/commit', { method: 'POST', json: { contacts: preview.body.data.contacts, duplicate: 'merge' } });
  check(c3.body.data.updated === 2 && c3.body.data.created === 0, '同名合并策略 merge');

  // ---- 导出并回读 ----
  const exported = await request('/api/excel/export', { binary: true });
  check(exported.status === 200 && exported.buffer.slice(0, 2).toString() === 'PK', '导出 Excel（xlsx 文件）');
  const ewb = await loadWorkbook(exported.buffer);
  const esheet = ewb.getWorksheet('联系人');
  const headers = esheet.getRow(1).values.map(String);
  check(headers.includes('姓名') && headers.includes('收藏') && headers.includes('手机2'), '导出表头含动态多联系方式列', headers.join(','));
  check(esheet.rowCount - 1 === (await request('/api/contacts?pageSize=200')).body.data.total, '导出行数 = 联系人总数（一人一行）');
  const rowA = [];
  esheet.eachRow((row, i) => { if (i > 1 && row.getCell(1).value === '冒烟测试A') rowA.push(row.values.map(String)); });
  check(rowA.length === 1 && rowA[0].includes('13800000001') && rowA[0].includes('13900000002'), '同一联系人两个手机号分别落列');
  check(rowA.length === 1 && rowA[0].includes('是'), '收藏状态导出为「是」');

  const roundTrip = await request('/api/excel/preview', { method: 'POST', form: excelUpload(exported.buffer, '导出回读.xlsx') });
  check(roundTrip.status === 200 && roundTrip.body.data.contacts.length === esheet.rowCount - 1, '导出的文件可被原样导入（往返一致性）');

  // ---- 筛选导出 ----
  const filtered = await request('/api/excel/export?bookmarked=true', { binary: true });
  const fwb = await loadWorkbook(filtered.buffer);
  const fRows = fwb.getWorksheet('联系人').rowCount - 1;
  check(fRows < esheet.rowCount - 1, '按当前筛选结果导出');

  // ---- 批量操作 ----
  const bulk = await request('/api/contacts/bulk', { method: 'POST', json: { ids: [id], action: 'unbookmark' } });
  check(bulk.body.data.affected === 1, '批量取消收藏');

  // ---- 清理测试数据 ----
  const leftovers = await request('/api/contacts?keyword=冒烟测试&pageSize=200');
  for (const c of leftovers.body.data.items) {
    await request(`/api/contacts/${c.id}`, { method: 'DELETE' });
  }
  const final = await request('/api/contacts?pageSize=200');
  check(final.body.data.total === initialTotal, '测试数据已清理，通讯录恢复初始状态');

  console.log(`\n=== 结果：${passed} 项通过，${failed} 项失败 ===`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('\n[ERROR] 测试中断：', err.message);
  console.error('请确认服务已启动：npm start');
  process.exitCode = 1;
});
