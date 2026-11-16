/* 通用工具：图标、转义、格式化、提示、确认框 */

const PATHS = {
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  star: '<path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  edit: '<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-3.5-.7L3 21l1.7-4.8A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.1"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.5h.01"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  tag: '<path d="M20.6 13.4 12 22l-9-9V3h10z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
};

/** 与后端 services/validate.js 保持一致的联系方式类型定义 */
export const METHOD_TYPES = [
  { value: 'phone', label: '手机', icon: 'phone' },
  { value: 'tel', label: '座机', icon: 'phone' },
  { value: 'email', label: '邮箱', icon: 'mail' },
  { value: 'wechat', label: '微信', icon: 'chat' },
  { value: 'qq', label: 'QQ', icon: 'chat' },
  { value: 'weibo', label: '微博', icon: 'globe' },
  { value: 'linkedin', label: '领英', icon: 'link' },
  { value: 'social', label: '社交账号', icon: 'link' },
  { value: 'address', label: '地址', icon: 'pin' },
  { value: 'website', label: '网站', icon: 'globe' },
  { value: 'other', label: '其他', icon: 'dots' },
];

export function typeInfo(type) {
  return METHOD_TYPES.find((t) => t.value === type) || METHOD_TYPES[METHOD_TYPES.length - 1];
}

export function icon(name, extraClass = '') {
  const body = PATHS[name] || PATHS.dots;
  return `<svg class="${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** 把 <span data-icon="xxx"></span> 替换为 SVG；动态渲染后调用即可 */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
    el.removeAttribute('data-icon');
  });
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const AVATAR_COLORS = [
  ['#6b8afd', '#3f5fd0'], ['#f0936a', '#dd6363'], ['#54c6a8', '#219b84'],
  ['#b083e8', '#7351c9'], ['#efb64b', '#dc8a26'], ['#5fb7e8', '#2b7ec4'],
  ['#ec7fa9', '#c74f86'], ['#7fa3d8', '#4a6da8'],
];

export function avatarStyle(name) {
  let hash = 0;
  for (const ch of String(name || '?')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return `--avatar-a:${a};--avatar-b:${b}`;
}

export function initials(name) {
  const text = String(name || '?').trim();
  if (!text) return '?';
  if (/[\u4e00-\u9fa5]/.test(text)) return text.slice(0, 2);
  return text.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function formatDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function toast(message, type = 'success', duration = 3000) {
  const stack = document.getElementById('toasts');
  const map = { success: 'check-circle', error: 'alert', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="icon">${icon(map[type] || 'info')}</span><span>${esc(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'opacity .2s, transform .2s';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

/** 独立确认框（不占用主弹窗容器），返回 Promise<boolean> */
export function confirmDialog({ title = '确认操作', message = '', confirmText = '确认', danger = false }) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `
      <div class="modal" style="width:min(420px,100%)">
        <div class="modal-head"><h2>${esc(title)}</h2></div>
        <div class="modal-body"><p style="margin:0;line-height:1.8;color:var(--text-2)">${esc(message)}</p></div>
        <div class="modal-foot">
          <button type="button" class="btn" data-cancel>取消</button>
          <button type="button" class="btn ${danger ? 'btn-primary' : 'btn-primary'}" data-confirm style="${danger ? 'background:var(--danger);border-color:var(--danger)' : ''}">${esc(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(mask);
    const close = (value) => { mask.remove(); resolve(value); };
    mask.querySelector('[data-cancel]').addEventListener('click', () => close(false));
    mask.querySelector('[data-confirm]').addEventListener('click', () => close(true));
    mask.addEventListener('click', (e) => { if (e.target === mask) close(false); });
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    toast('已复制到剪贴板');
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('复制失败，请手动选择文本', 'error'); }
    ta.remove();
  }
}
