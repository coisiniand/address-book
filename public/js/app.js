/* ==========================================================================
   EE308FZ Address Book — 前端主逻辑
   模块划分：api.js（网络）/ utils.js（通用）/ app.js（状态 + 渲染 + 交互）
   ========================================================================== */

import { api, download } from './api.js';
import {
  METHOD_TYPES, typeInfo, icon, hydrateIcons, esc, avatarStyle, initials,
  formatDate, debounce, toast, confirmDialog, copyText,
} from './utils.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  view: 'all',       // all | bookmarked
  tag: '',
  keyword: '',
  sort: 'updated',
  mode: 'card',      // card | table
  page: 1,
  pageSize: 12,
  total: 0,
  items: [],
  tags: [],
  stats: { total: 0, bookmarked: 0, methods: 0, tags: 0 },
  selected: new Set(),
};

/** 详情/编辑时直接复用列表数据，避免重复请求 */
const cache = new Map();

let parsedImport = null;

/* ------------------------------- 数据加载 -------------------------------- */

function listQuery() {
  return {
    keyword: state.keyword,
    bookmarked: state.view === 'bookmarked' ? true : undefined,
    tag: state.tag,
    sort: state.sort,
    page: state.page,
    pageSize: state.pageSize,
  };
}

function exportQuery(all = false) {
  if (all) return { sort: state.sort };
  return {
    keyword: state.keyword,
    bookmarked: state.view === 'bookmarked' ? true : undefined,
    tag: state.tag,
    sort: state.sort,
  };
}

async function refresh() {
  try {
    const [list, tags, stats] = await Promise.all([
      api.list(listQuery()), api.tags(), api.stats(),
    ]);
    state.items = list.items;
    state.total = list.total;
    state.page = list.page;
    state.tags = tags;
    state.stats = stats;
    for (const c of list.items) cache.set(c.id, c);
    // 清掉不在当前结果里的选中项
    const visible = new Set(list.items.map((c) => c.id));
    for (const id of state.selected) if (!visible.has(id)) state.selected.delete(id);
    // 删除后当前页可能变空，自动回退一页
    if (list.total > 0 && list.items.length === 0 && list.page > 1) {
      state.page = list.page - 1;
      return refresh();
    }
    render();
  } catch (err) {
    toast(err.message, 'error', 5000);
    $('#loading').classList.add('hidden');
  }
}

/* ------------------------------- 渲染 ------------------------------------ */

function render() {
  $('#count-all').textContent = state.stats.total;
  $('#count-star').textContent = state.stats.bookmarked;
  $('#mini-stats').innerHTML = `
    <div class="mini-stat"><strong>${state.stats.total}</strong><small>联系人</small></div>
    <div class="mini-stat"><strong>${state.stats.bookmarked}</strong><small>已收藏</small></div>
    <div class="mini-stat"><strong>${state.stats.methods}</strong><small>联系方式</small></div>`;

  $$('.nav-item').forEach((btn) => btn.classList.toggle('active',
    btn.dataset.view === state.view && !state.tag));

  $('#tag-list').innerHTML = state.tags.length
    ? state.tags.map((t) => `
        <button type="button" class="tag-nav ${state.tag === t.name ? 'active' : ''}" data-tag="${esc(t.name)}">
          <span class="tag-dot"></span><span>${esc(t.name)}</span><small>${t.count}</small>
        </button>`).join('')
    : '<div class="tag-empty">还没有标签，编辑联系人时可添加</div>';
  $('#btn-clear-tag').classList.toggle('hidden', !state.tag);

  const title = state.tag ? `标签：${state.tag}` : (state.view === 'bookmarked' ? '我的收藏' : '全部联系人');
  $('#page-title').textContent = title;
  const filters = [];
  if (state.keyword) filters.push(`关键词「${state.keyword}」`);
  if (state.view === 'bookmarked') filters.push('仅收藏');
  $('#page-subtitle').textContent = `共 ${state.total} 位联系人${filters.length ? ` · ${filters.join(' · ')}` : ' · 支持收藏、多联系方式与 Excel 导入导出'}`;
  $('#search-clear').classList.toggle('hidden', !state.keyword);

  renderContent();
  renderPagination();
  renderBulkBar();
  hydrateIcons(document);
}

function methodRowHtml(m) {
  const info = typeInfo(m.type);
  return `<div class="method-row">
    <span class="icon">${icon(info.icon)}</span>
    <span class="m-label">${esc(m.label || info.label)}</span>
    <span class="m-value" title="${esc(m.value)}">${esc(m.value)}</span>
  </div>`;
}

function cardHtml(c) {
  const methods = c.contactMethods || [];
  const meta = [c.title, c.company].filter(Boolean).join(' · ') || '暂无公司 / 职位信息';
  return `<article class="contact-card ${state.selected.has(c.id) ? 'selected' : ''}" data-id="${c.id}" style="${avatarStyle(c.name)}">
    <div class="card-top">
      <div class="avatar">${esc(initials(c.name))}</div>
      <div class="card-identity">
        <div class="card-name">
          <h3>${esc(c.name)}</h3>
          ${c.bookmarked ? '<span class="badge-star">已收藏</span>' : ''}
        </div>
        <div class="card-meta" title="${esc(meta)}">${esc(meta)}</div>
      </div>
      <button type="button" class="star-btn ${c.bookmarked ? 'on' : ''}" data-action="star" title="${c.bookmarked ? '取消收藏' : '加入收藏'}">
        <span class="icon">${icon('star')}</span>
      </button>
    </div>
    <div class="method-list">
      ${methods.length
        ? methods.slice(0, 3).map(methodRowHtml).join('') +
          (methods.length > 3 ? `<div class="method-more">另有 ${methods.length - 3} 条联系方式，点击查看详情</div>` : '')
        : '<div class="no-method">暂无联系方式</div>'}
    </div>
    <div class="card-tags">
      ${(c.tags || []).slice(0, 4).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
    </div>
    <div class="card-footer">
      <label class="card-check">
        <input type="checkbox" data-action="select" ${state.selected.has(c.id) ? 'checked' : ''} />
        选择
      </label>
      <button type="button" class="card-action" data-action="open" title="查看详情"><span class="icon">${icon('info')}</span></button>
      <button type="button" class="card-action" data-action="edit" title="编辑"><span class="icon">${icon('edit')}</span></button>
      <button type="button" class="card-action danger" data-action="delete" title="删除"><span class="icon">${icon('trash')}</span></button>
    </div>
  </article>`;
}

function tableHtml() {
  const rows = state.items.map((c) => {
    const methods = c.contactMethods || [];
    return `<tr data-id="${c.id}">
      <td><input type="checkbox" data-action="select" ${state.selected.has(c.id) ? 'checked' : ''} /></td>
      <td><div class="table-name"><span class="avatar sm" style="${avatarStyle(c.name)}">${esc(initials(c.name))}</span>${esc(c.name)}${c.bookmarked ? ' <span class="badge-star">已收藏</span>' : ''}</div></td>
      <td>${esc(c.company || '—')}<br><small style="color:var(--muted)">${esc(c.title || '')}</small></td>
      <td><div class="table-methods">${methods.length ? esc(`${methods[0].value}${methods.length > 1 ? ` 等 ${methods.length} 条` : ''}`) : '—'}</div></td>
      <td>${(c.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join(' ')}</td>
      <td><button type="button" class="star-btn ${c.bookmarked ? 'on' : ''}" data-action="star"><span class="icon">${icon('star')}</span></button></td>
      <td><div class="table-actions">
        <button type="button" class="card-action" data-action="open" title="详情"><span class="icon">${icon('info')}</span></button>
        <button type="button" class="card-action" data-action="edit" title="编辑"><span class="icon">${icon('edit')}</span></button>
        <button type="button" class="card-action danger" data-action="delete" title="删除"><span class="icon">${icon('trash')}</span></button>
      </div></td>
    </tr>`;
  }).join('');
  return `<table>
    <thead><tr>
      <th style="width:38px"><input type="checkbox" id="select-all" title="全选本页" /></th>
      <th>姓名</th><th>公司 / 职位</th><th>联系方式</th><th>标签</th><th style="width:52px">收藏</th><th style="width:110px"></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderContent() {
  const isEmpty = state.items.length === 0;
  $('#cards').classList.toggle('hidden', isEmpty || state.mode !== 'card');
  $('#table-wrap').classList.toggle('hidden', isEmpty || state.mode !== 'table');
  $('#empty').classList.toggle('hidden', !isEmpty);
  $('#loading').classList.add('hidden');
  if (isEmpty) {
    const filtered = Boolean(state.keyword || state.tag || state.view === 'bookmarked');
    $('#empty-title').textContent = filtered ? '没有匹配的联系人' : '还没有联系人';
    $('#empty-desc').textContent = filtered
      ? '试试更换关键词，或清除当前筛选条件。'
      : '点击「新建联系人」，或用「导入 Excel」批量添加。';
    $('#empty-action').textContent = filtered ? '清除筛选' : '新建联系人';
    return;
  }
  $('#cards').innerHTML = state.items.map(cardHtml).join('');
  $('#table-wrap').innerHTML = tableHtml();
  const allChecked = state.items.length && state.items.every((c) => state.selected.has(c.id));
  const selectAll = $('#select-all');
  if (selectAll) selectAll.checked = Boolean(allChecked);
}

function renderPagination() {
  const pages = Math.ceil(state.total / state.pageSize);
  const el = $('#pagination');
  if (pages <= 1) { el.innerHTML = state.total ? `<span>共 ${state.total} 位联系人</span>` : ''; return; }
  let buttons = `<button type="button" class="page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>上一页</button>`;
  for (let p = 1; p <= pages; p += 1) {
    if (pages > 9 && p > 2 && p < pages - 1 && Math.abs(p - state.page) > 2) {
      if (p === 3) buttons += '<span>…</span>';
      continue;
    }
    buttons += `<button type="button" class="page-btn ${p === state.page ? 'current' : ''}" data-page="${p}">${p}</button>`;
  }
  buttons += `<button type="button" class="page-btn" data-page="${state.page + 1}" ${state.page >= pages ? 'disabled' : ''}>下一页</button>`;
  el.innerHTML = buttons;
}

function renderBulkBar() {
  const n = state.selected.size;
  $('#bulk-bar').classList.toggle('hidden', n === 0);
  $('#bulk-count').textContent = `已选择 ${n} 位联系人`;
}

/* ------------------------------- 通用弹窗 -------------------------------- */

function openModal(html, wide = false) {
  const modal = $('#modal');
  modal.className = wide ? 'modal wide' : 'modal';
  modal.innerHTML = html;
  $('#modal-mask').classList.remove('hidden');
  hydrateIcons(modal);
}

function closeModal() {
  $('#modal-mask').classList.add('hidden');
  $('#modal').innerHTML = '';
}

function modalHead(title, subtitle = '') {
  return `<div class="modal-head">
    <div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
    <button type="button" class="drawer-close" data-close style="position:static;background:var(--surface-3);color:var(--muted)"><span class="icon">${icon('close')}</span></button>
  </div>`;
}

/* ------------------------------- 详情抽屉 -------------------------------- */

async function openDrawer(id) {
  try {
    const c = await api.get(id);
    cache.set(c.id, c);
    renderDrawer(c);
  } catch (err) { toast(err.message, 'error'); }
}

function renderDrawer(c) {
  drawerCurrentId = c.id;
  const methods = c.contactMethods || [];
  const drawer = $('#drawer');
  drawer.innerHTML = `
    <div class="drawer-head" style="${avatarStyle(c.name)}">
      <button type="button" class="drawer-close" data-close><span class="icon">${icon('close')}</span></button>
      <div class="avatar lg">${esc(initials(c.name))}</div>
      <h2>${esc(c.name)} ${c.bookmarked ? '<span style="font-size:14px">★</span>' : ''}</h2>
      <p>${esc([c.title, c.company].filter(Boolean).join(' · ') || '暂无职位信息')}</p>
    </div>
    <div class="drawer-body">
      <div class="drawer-actions">
        <button type="button" class="btn btn-primary" data-drawer="edit"><span class="icon">${icon('edit')}</span>编辑</button>
        <button type="button" class="btn" data-drawer="star"><span class="icon">${icon('star')}</span>${c.bookmarked ? '取消收藏' : '加入收藏'}</button>
        <button type="button" class="btn btn-danger-ghost" data-drawer="delete"><span class="icon">${icon('trash')}</span>删除</button>
      </div>

      <div class="section-title">联系方式 · ${methods.length} 条</div>
      ${methods.length ? methods.map((m) => `
        <div class="detail-method">
          <div class="m-icon"><span class="icon">${icon(typeInfo(m.type).icon)}</span></div>
          <div class="m-body"><small>${esc(m.label || typeInfo(m.type).label)}${m.primary ? ' · 主要' : ''}</small><strong>${esc(m.value)}</strong></div>
          <button type="button" class="m-copy" data-copy="${esc(m.value)}" title="复制"><span class="icon">${icon('copy')}</span></button>
        </div>`).join('') : '<p class="no-method">暂无联系方式，点击「编辑」添加。</p>'}

      <div class="section-title">基本信息</div>
      <dl class="info-grid">
        <dt>公司</dt><dd>${esc(c.company || '—')}</dd>
        <dt>部门</dt><dd>${esc(c.department || '—')}</dd>
        <dt>职位</dt><dd>${esc(c.title || '—')}</dd>
        <dt>生日</dt><dd>${esc(c.birthday || '—')}</dd>
        <dt>收藏</dt><dd>${c.bookmarked ? '是（已加入书签）' : '否'}</dd>
      </dl>

      <div class="section-title">标签</div>
      <div class="card-tags">${(c.tags || []).length ? c.tags.map((t) => `<span class="chip accent">${esc(t)}</span>`).join('') : '<span class="no-method">无标签</span>'}</div>

      <div class="section-title">备注</div>
      <div class="note-box">${esc(c.note || '暂无备注')}</div>

      <div class="section-title">记录信息</div>
      <dl class="info-grid">
        <dt>创建时间</dt><dd>${formatDate(c.createdAt, true)}</dd>
        <dt>更新时间</dt><dd>${formatDate(c.updatedAt, true)}</dd>
      </dl>
    </div>`;
  drawer.classList.remove('hidden');
  $('#drawer-mask').classList.remove('hidden');
  hydrateIcons(drawer);
}

function closeDrawer() {
  $('#drawer').classList.add('hidden');
  $('#drawer-mask').classList.add('hidden');
}

/* ------------------------------- 新建 / 编辑表单 -------------------------- */

function methodEditorRow(m = {}) {
  const info = typeInfo(m.type || 'phone');
  const auto = !m.label || m.label === info.label ? '1' : '0';
  return `<div class="method-edit-row" data-auto="${auto}">
    <select class="m-type input" aria-label="联系方式类型">
      ${METHOD_TYPES.map((t) => `<option value="${t.value}" ${t.value === info.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
    </select>
    <input class="input m-label" placeholder="标签（可留空）" value="${esc(m.label || info.label)}" />
    <input class="input m-value-input" placeholder="电话 / 邮箱 / 账号 / 地址…" value="${esc(m.value || '')}" />
    <button type="button" class="row-primary ${m.primary ? 'on' : ''}" title="设为主要联系方式"><span class="icon">${icon('star')}</span></button>
    <button type="button" class="row-del" title="删除这一条"><span class="icon">${icon('trash')}</span></button>
  </div>`;
}

function openContactForm(id = null) {
  const c = id ? cache.get(id) : null;
  if (id && !c) { toast('联系人数据未加载，请刷新后重试', 'error'); return; }
  const methods = c ? (c.contactMethods || []).map((m) => ({ ...m })) : [{ type: 'phone', label: '手机', value: '', primary: true }];
  openModal(`
    ${modalHead(c ? '编辑联系人' : '新建联系人', c ? `正在编辑「${c.name}」` : '填写基本信息，可添加任意多条联系方式')}
    <div class="modal-body">
      <form id="contact-form" autocomplete="off">
        <div class="form-grid">
          <div class="field"><label>姓名 <span class="req">*</span></label><input class="input" name="name" maxlength="40" value="${esc(c?.name || '')}" placeholder="例如：林晓" /></div>
          <div class="field"><label>公司 / 单位</label><input class="input" name="company" value="${esc(c?.company || '')}" placeholder="例如：星海科技" /></div>
          <div class="field"><label>部门</label><input class="input" name="department" value="${esc(c?.department || '')}" /></div>
          <div class="field"><label>职位</label><input class="input" name="title" value="${esc(c?.title || '')}" /></div>
          <div class="field"><label>生日</label><input class="input" name="birthday" type="date" value="${esc(c?.birthday || '')}" /></div>
          <div class="field"><label>标签</label><input class="input" name="tags" value="${esc((c?.tags || []).join('、'))}" placeholder="多个标签用逗号或顿号分隔" /></div>
          <div class="field full"><label>备注</label><textarea name="note" placeholder="补充说明…">${esc(c?.note || '')}</textarea></div>
        </div>

        <div class="divider-title"><strong>联系方式 · 可添加多条</strong><span class="field-hint">支持手机、邮箱、微信、地址等 11 种类型</span></div>
        <div class="method-editor" id="method-editor">${methods.map(methodEditorRow).join('')}</div>
        <button type="button" class="btn btn-sm add-method" id="add-method"><span class="icon">${icon('plus')}</span>添加一条联系方式</button>

        <div class="divider-title"><strong>书签设置</strong></div>
        <label class="switch-row"><input type="checkbox" name="bookmarked" ${c?.bookmarked ? 'checked' : ''} /><span>加入收藏，方便在「我的收藏」中快速找到</span></label>
      </form>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn" data-close>取消</button>
      <button type="submit" form="contact-form" class="btn btn-primary">${c ? '保存修改' : '创建联系人'}</button>
    </div>`, true);
  $('#contact-form').dataset.editId = id || '';
  $('#contact-form').querySelector('[name="name"]').focus();
}

function collectForm(form) {
  const fd = new FormData(form);
  const rows = $$('.method-edit-row', $('#method-editor'));
  return {
    name: String(fd.get('name') || '').trim(),
    company: String(fd.get('company') || '').trim(),
    department: String(fd.get('department') || '').trim(),
    title: String(fd.get('title') || '').trim(),
    birthday: String(fd.get('birthday') || '').trim(),
    tags: String(fd.get('tags') || ''),
    note: String(fd.get('note') || '').trim(),
    bookmarked: fd.get('bookmarked') === 'on',
    contactMethods: rows.map((row) => ({
      type: $('.m-type', row).value,
      label: $('.m-label', row).value.trim(),
      value: $('.m-value-input', row).value.trim(),
      primary: $('.row-primary', row).classList.contains('on'),
    })).filter((m) => m.value),
  };
}

async function submitContactForm(e) {
  e.preventDefault();
  const form = e.target;
  const payload = collectForm(form);
  if (!payload.name) { toast('请填写联系人姓名', 'error'); $('[name="name"]', form).focus(); return; }
  const editId = form.dataset.editId;
  try {
    if (editId) await api.update(editId, payload);
    else await api.create(payload);
    toast(editId ? '联系人已更新' : '联系人已创建');
    closeModal();
    await refresh();
    if (!$('#drawer').classList.contains('hidden')) { if (editId) closeDrawer(); }
  } catch (err) { toast(err.message, 'error'); }
}

/* ------------------------------- Excel 导入向导 --------------------------- */

function openImportWizard() {
  parsedImport = null;
  openModal(`
    ${modalHead('导入 Excel 通讯录', '先预览解析结果，确认无误后再写入通讯录')}
    <div class="modal-body">
      <div class="alert alert-info">支持 <strong>.xlsx</strong> 文件。每个联系人占一行，姓名、公司、收藏、标签等各占一列；同类联系方式有多条时，使用「手机」「手机2」「邮箱2」这样的列名即可。<strong>「收藏」列填「是」即加入书签。</strong></div>
      <div class="upload-zone" id="drop-zone">
        <span class="icon">${icon('file')}</span>
        <h3>点击选择，或把 .xlsx 文件拖到这里</h3>
        <p>单个文件不超过 5MB · 仅解析，不会立即修改数据</p>
        <button type="button" class="btn btn-primary" id="pick-file"><span class="icon">${icon('upload')}</span>选择 Excel 文件</button>
        <input type="file" id="file-input" accept=".xlsx" />
      </div>
      <p style="margin-top:14px;color:var(--muted);font-size:12px">
        没有现成文件？
        <button type="button" class="link-btn" id="dl-template">下载标准导入模板（含示例与字段说明）</button>
      </p>
    </div>
    <div class="modal-foot"><button type="button" class="btn" data-close>关闭</button></div>`, true);
}

function renderImportStep2(data) {
  parsedImport = data;
  const rows = data.contacts.slice(0, 8).map((c) => {
    const methods = c.contactMethods || [];
    return `<tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.company || '—')}</td>
      <td>${c.bookmarked ? '是' : '否'}</td>
      <td>${methods.length}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(methods.map((m) => m.value).join('、') || '—')}</td>
    </tr>`;
  }).join('');
  const warnings = data.warnings.slice(0, 3);
  openModal(`
    ${modalHead('导入预览', `文件：${data.fileName} · 工作表：${data.sheetName}`)}
    <div class="modal-body">
      <div class="import-meta">
        <span class="stat-pill">数据行 <strong>${data.rowCount}</strong></span>
        <span class="stat-pill">可导入 <strong>${data.contacts.length}</strong></span>
        <span class="stat-pill">识别列 <strong>${data.mappedColumns.length}</strong></span>
        ${data.warnings.length ? `<span class="stat-pill warn">跳过 <strong>${data.warnings.length}</strong></span>` : ''}
      </div>
      ${warnings.length ? `<div class="alert alert-warn">${warnings.map((w) => `第 ${w.row} 行：${esc(w.reason)}`).join('<br>')}${data.warnings.length > 3 ? `<br>另有 ${data.warnings.length - 3} 条提示…` : ''}</div>` : ''}
      ${data.ignoredColumns.length ? `<div class="alert alert-info">未识别的列（已忽略）：${esc(data.ignoredColumns.join('、'))}</div>` : ''}
      <div class="section-title" style="margin-top:18px">数据预览（前 ${Math.min(8, data.contacts.length)} 行）</div>
      <div class="preview-table"><table>
        <thead><tr><th>姓名</th><th>公司</th><th>收藏</th><th>联系方式</th><th>联系方式内容</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">没有可导入的数据</td></tr>'}</tbody>
      </table></div>

      <div class="section-title">遇到同名联系人时</div>
      <div class="radio-group">
        <label class="radio-card"><input type="radio" name="duplicate" value="append" checked /><span><strong>全部新增（默认）</strong><small>保留已有记录，Excel 中每一行都新建一位联系人</small></span></label>
        <label class="radio-card"><input type="radio" name="duplicate" value="merge" /><span><strong>合并到同名联系人</strong><small>补充缺失字段，并把新的联系方式合并进去（自动去重）</small></span></label>
        <label class="radio-card"><input type="radio" name="duplicate" value="skip" /><span><strong>跳过同名联系人</strong><small>只导入通讯录中尚不存在的姓名</small></span></label>
      </div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn" id="import-reset">重新选择文件</button>
      <button type="button" class="btn btn-primary" id="import-confirm" ${data.contacts.length ? '' : 'disabled'}>确认导入 ${data.contacts.length} 条</button>
    </div>`, true);
}

function renderImportStep3(report) {
  openModal(`
    ${modalHead('导入完成', '数据已写入通讯录')}
    <div class="modal-body">
      <div class="result-report">
        <span class="icon">${icon('check-circle')}</span>
        <h3>成功导入 ${report.created + report.updated} 条记录</h3>
        <p>新增 ${report.created} · 更新 ${report.updated} · 跳过 ${report.skipped}</p>
      </div>
      <div class="import-meta" style="justify-content:center">
        <span class="stat-pill">本次共读取 <strong>${report.total}</strong> 条</span>
        <span class="stat-pill">当前通讯录共 <strong>${state.stats.total}</strong> 人</span>
      </div>
      ${report.errors.length ? `<div class="alert alert-warn">${report.errors.slice(0, 5).map((e) => `第 ${e.row} 行：${esc(e.reason)}`).join('<br>')}</div>` : ''}
    </div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" data-close>查看通讯录</button></div>`);
}

async function uploadExcel(file) {
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { toast('请选择 .xlsx 格式的文件（旧版 .xls 请另存为 .xlsx）', 'error'); return; }
  const zone = $('#drop-zone');
  if (zone) zone.innerHTML = `<span class="spinner"></span><h3>正在解析 ${esc(file.name)}…</h3><p>请稍候</p>`;
  try {
    const data = await api.previewExcel(file);
    renderImportStep2(data);
    toast(`解析完成，识别到 ${data.contacts.length} 条联系人`, 'info');
  } catch (err) {
    toast(err.message, 'error', 5000);
    openImportWizard();
  }
}

async function commitImport() {
  if (!parsedImport || !parsedImport.contacts.length) return;
  const duplicate = $('input[name="duplicate"]:checked')?.value || 'append';
  const btn = $('#import-confirm');
  btn.disabled = true;
  btn.textContent = '正在导入…';
  try {
    const report = await api.commitExcel(parsedImport.contacts, duplicate);
    await refresh();
    renderImportStep3(report);
    toast(`导入完成：新增 ${report.created}，更新 ${report.updated}`);
  } catch (err) {
    toast(err.message, 'error', 5000);
    btn.disabled = false;
    btn.textContent = `确认导入 ${parsedImport.contacts.length} 条`;
  }
}

/* ------------------------------- 交互动作 -------------------------------- */

async function handleAction(action, id) {
  const c = cache.get(id);
  switch (action) {
    case 'star': {
      try {
        const updated = await api.bookmark(id);
        cache.set(id, updated);
        toast(updated.bookmarked ? '已加入收藏' : '已取消收藏');
        await refresh();
        if (!$('#drawer').classList.contains('hidden')) renderDrawer(updated);
      } catch (err) { toast(err.message, 'error'); }
      break;
    }
    case 'open': openDrawer(id); break;
    case 'edit': openContactForm(id); break;
    case 'delete': {
      const ok = await confirmDialog({
        title: '删除联系人',
        message: `确定要删除「${c?.name || '该联系人'}」吗？此操作不可撤销。`,
        confirmText: '确认删除', danger: true,
      });
      if (!ok) return;
      try {
        await api.remove(id);
        toast('联系人已删除');
        closeDrawer();
        await refresh();
      } catch (err) { toast(err.message, 'error'); }
      break;
    }
    default: break;
  }
}

async function runBulk(action) {
  const ids = [...state.selected];
  if (!ids.length) return;
  if (action === 'delete') {
    const ok = await confirmDialog({
      title: '批量删除',
      message: `确定删除选中的 ${ids.length} 位联系人吗？此操作不可撤销。`,
      confirmText: '确认删除', danger: true,
    });
    if (!ok) return;
  }
  try {
    const result = await api.bulk(ids, action);
    toast(`已处理 ${result.affected} 位联系人`);
    state.selected.clear();
    await refresh();
  } catch (err) { toast(err.message, 'error'); }
}

function contactActionHandler(e) {
  if (e.target.closest('input[type="checkbox"]') || e.target.closest('label.card-check')) return;
  const card = e.target.closest('[data-id]');
  if (!card) return;
  const id = card.dataset.id;
  const actionEl = e.target.closest('[data-action]');
  if (actionEl) { e.preventDefault(); handleAction(actionEl.dataset.action, id); }
  else if (e.target.closest('.contact-card') || e.target.closest('tbody tr')) openDrawer(id);
}

function contactChangeHandler(e) {
  const el = e.target;
  if (el.id === 'select-all') {
    for (const c of state.items) {
      if (el.checked) state.selected.add(c.id); else state.selected.delete(c.id);
    }
    renderContent(); renderBulkBar(); hydrateIcons(document);
    return;
  }
  if (el.dataset.action !== 'select') return;
  const id = el.closest('[data-id]')?.dataset.id;
  if (!id) return;
  if (el.checked) state.selected.add(id); else state.selected.delete(id);
  el.closest('[data-id]')?.classList.toggle('selected', el.checked);
  renderBulkBar();
}

/* ------------------------------- 主题 ------------------------------------ */

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('ab-theme', dark ? 'dark' : 'light');
  const iconEl = $('#btn-theme .icon');
  if (iconEl) {
    iconEl.removeAttribute('data-icon');
    iconEl.innerHTML = icon(dark ? 'sun' : 'moon');
  }
  $('#theme-label').textContent = dark ? '切换到浅色模式' : '切换到深色模式';
}

/* ------------------------------- 事件绑定 -------------------------------- */

function bindEvents() {
  // 顶部搜索
  const onSearch = debounce((value) => {
    state.keyword = value.trim();
    state.page = 1;
    refresh();
  }, 260);
  $('#search').addEventListener('input', (e) => onSearch(e.target.value));
  $('#search-clear').addEventListener('click', () => {
    $('#search').value = '';
    state.keyword = ''; state.page = 1; refresh();
  });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; refresh(); });

  // 视图切换
  $$('.view-switch button').forEach((btn) => btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    $$('.view-switch button').forEach((b) => b.classList.toggle('active', b === btn));
    renderContent(); hydrateIcons(document);
  }));

  // 左侧导航 / 标签
  $$('.nav-item').forEach((btn) => btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    state.tag = ''; state.page = 1;
    closeSidebar();
    refresh();
  }));
  $('#tag-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tag]');
    if (!btn) return;
    state.tag = state.tag === btn.dataset.tag ? '' : btn.dataset.tag;
    state.view = 'all'; state.page = 1;
    closeSidebar(); refresh();
  });
  $('#btn-clear-tag').addEventListener('click', () => { state.tag = ''; state.page = 1; refresh(); });

  // 移动端侧栏
  const sidebar = $('#sidebar');
  const sidebarMask = $('#sidebar-mask');
  $('#btn-menu').addEventListener('click', () => {
    sidebar.classList.add('open'); sidebarMask.classList.remove('hidden');
  });
  sidebarMask.addEventListener('click', closeSidebar);

  // 主题
  $('#btn-theme').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // 工具栏
  $('#btn-new').addEventListener('click', () => openContactForm());
  $('#btn-import').addEventListener('click', openImportWizard);
  $('#btn-export').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#export-menu').classList.toggle('hidden');
  });
  $('#export-menu').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-export]');
    if (!btn) return;
    $('#export-menu').classList.add('hidden');
    const kind = btn.dataset.export;
    if (kind === 'template') download(api.templateUrl(), '通讯录导入模板.xlsx');
    else download(api.exportUrl(kind === 'all' ? exportQuery(true) : exportQuery(false)), '通讯录.xlsx');
    toast(kind === 'template' ? '模板下载已开始' : 'Excel 导出已开始，请查看浏览器下载', 'info');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) $('#export-menu').classList.add('hidden');
  });

  // 联系人列表（卡片 / 表格）
  $('#cards').addEventListener('click', contactActionHandler);
  $('#table-wrap').addEventListener('click', contactActionHandler);
  $('#cards').addEventListener('change', contactChangeHandler);
  $('#table-wrap').addEventListener('change', contactChangeHandler);

  // 分页
  $('#pagination').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.page);
    refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 批量操作
  $('#bulk-star').addEventListener('click', () => runBulk('bookmark'));
  $('#bulk-unstar').addEventListener('click', () => runBulk('unbookmark'));
  $('#bulk-delete').addEventListener('click', () => runBulk('delete'));
  $('#bulk-cancel').addEventListener('click', () => {
    state.selected.clear(); renderContent(); renderBulkBar(); hydrateIcons(document);
  });

  // 空状态按钮
  $('#empty-action').addEventListener('click', () => {
    if (state.keyword || state.tag || state.view === 'bookmarked') {
      state.keyword = ''; state.tag = ''; state.view = 'all'; state.page = 1;
      $('#search').value = '';
      refresh();
    } else openContactForm();
  });

  // 抽屉
  $('#drawer-mask').addEventListener('click', closeDrawer);
  $('#drawer').addEventListener('click', async (e) => {
    if (e.target.closest('[data-close]')) return closeDrawer();
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) return copyText(copyBtn.dataset.copy);
    const btn = e.target.closest('[data-drawer]');
    if (!btn) return;
    const currentId = drawerCurrentId;
    if (!currentId) return;
    if (btn.dataset.drawer === 'star') await handleAction('star', currentId);
    else if (btn.dataset.drawer === 'edit') openContactForm(currentId);
    else if (btn.dataset.drawer === 'delete') await handleAction('delete', currentId);
  });

  // 弹窗（事件委托，覆盖所有步骤）
  const modal = $('#modal');
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return closeModal();
    const fileInput = $('#file-input');
    if (e.target.closest('#pick-file')) return fileInput?.click();
    if (e.target.closest('#drop-zone')) return fileInput?.click();
    if (e.target.closest('#dl-template')) {
      download(api.templateUrl(), '通讯录导入模板.xlsx');
      return toast('模板下载已开始', 'info');
    }
    if (e.target.closest('#add-method')) {
      const editor = $('#method-editor');
      editor.insertAdjacentHTML('beforeend', methodEditorRow({ type: 'phone', label: '手机', value: '', primary: false }));
      hydrateIcons(editor);
      return;
    }
    if (e.target.closest('.row-del')) return e.target.closest('.method-edit-row').remove();
    if (e.target.closest('.row-primary')) {
      const btn = e.target.closest('.row-primary');
      $$('.row-primary', $('#method-editor')).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      return;
    }
    if (e.target.closest('#import-reset')) return openImportWizard();
    if (e.target.closest('#import-confirm')) return commitImport();
  });
  modal.addEventListener('change', (e) => {
    if (e.target.id === 'file-input') uploadExcel(e.target.files[0]);
    if (e.target.classList.contains('m-type')) {
      const row = e.target.closest('.method-edit-row');
      const label = row.querySelector('.m-label');
      if (row.dataset.auto === '1') label.value = typeInfo(e.target.value).label;
    }
  });
  modal.addEventListener('input', (e) => {
    if (e.target.classList.contains('m-label')) {
      const row = e.target.closest('.method-edit-row');
      row.dataset.auto = e.target.value === typeInfo(row.querySelector('.m-type').value).label ? '1' : '0';
    }
  });
  modal.addEventListener('submit', (e) => {
    if (e.target.id === 'contact-form') submitContactForm(e);
  });
  modal.addEventListener('dragover', (e) => {
    if (!e.target.closest('#drop-zone')) return;
    e.preventDefault();
    e.target.closest('#drop-zone').classList.add('dragover');
  });
  modal.addEventListener('dragleave', (e) => {
    const zone = e.target.closest('#drop-zone');
    if (zone) zone.classList.remove('dragover');
  });
  modal.addEventListener('drop', (e) => {
    const zone = e.target.closest('#drop-zone');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('dragover');
    uploadExcel(e.dataTransfer.files[0]);
  });
  $('#modal-mask').addEventListener('click', (e) => { if (e.target.id === 'modal-mask') closeModal(); });

  // Esc 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#modal-mask').classList.contains('hidden')) closeModal();
    else if (!$('#drawer').classList.contains('hidden')) closeDrawer();
    else { $('#export-menu').classList.add('hidden'); closeSidebar(); }
  });
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-mask').classList.add('hidden');
}

let drawerCurrentId = null;

/* ------------------------------- 启动 ------------------------------------ */

function init() {
  hydrateIcons(document);
  applyTheme(localStorage.getItem('ab-theme') || 'light');
  bindEvents();
  refresh();
}

init();
