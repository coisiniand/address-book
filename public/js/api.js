/* 前端 API 封装：所有后端交互集中在此，便于分工与替换实现 */

const BASE = '/api';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body instanceof FormData ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body instanceof FormData ? body : (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch (_) {
    throw new Error('无法连接服务器，请确认后端服务已启动（npm start）');
  }
  let json;
  try { json = await res.json(); } catch (_) { throw new Error(`服务器返回异常（HTTP ${res.status}）`); }
  if (!res.ok || json.code !== 0) throw new Error(json.message || `请求失败（HTTP ${res.status}）`);
  return json.data;
}

function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const api = {
  list: (params) => request(`/contacts${qs(params)}`),
  get: (id) => request(`/contacts/${encodeURIComponent(id)}`),
  create: (data) => request('/contacts', { method: 'POST', body: data }),
  update: (id, data) => request(`/contacts/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  bookmark: (id, bookmarked) => request(`/contacts/${encodeURIComponent(id)}/bookmark`, {
    method: 'PATCH', body: bookmarked === undefined ? {} : { bookmarked },
  }),
  bulk: (ids, action) => request('/contacts/bulk', { method: 'POST', body: { ids, action } }),
  tags: () => request('/contacts/tags'),
  stats: () => request('/contacts/stats'),

  /** Excel：导出/模板用浏览器下载；导入分「预览」与「提交」两步 */
  exportUrl: (params = {}) => `${BASE}/excel/export${qs(params)}`,
  templateUrl: () => `${BASE}/excel/template`,
  previewExcel: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/excel/preview', { method: 'POST', body: form });
  },
  commitExcel: (contacts, duplicate) => request('/excel/commit', {
    method: 'POST', body: { contacts, duplicate },
  }),
};

/** 触发浏览器下载（文件名由后端 Content-Disposition 指定） */
export function download(url, fallbackName = '通讯录.xlsx') {
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
