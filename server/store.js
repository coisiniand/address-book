'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { sanitizeContact, sanitizeMethods } = require('./services/validate');

/**
 * 轻量 JSON 文件仓储。
 * 选择 JSON 文件而非数据库：零安装、可复现、便于本地/Git 展示数据，
 * 同时用「临时文件 + rename」保证写入原子性，避免写一半损坏数据。
 */
class ContactStore {
  constructor(file = config.DATA_FILE) {
    this.file = file;
    this.db = { version: 1, updatedAt: null, contacts: [] };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      const contacts = Array.isArray(parsed) ? parsed : parsed.contacts;
      if (!Array.isArray(contacts)) throw new Error('contacts 字段不是数组');
      this.db = {
        version: (parsed && parsed.version) || 1,
        updatedAt: (parsed && parsed.updatedAt) || null,
        contacts,
      };
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`[store] 数据文件读取失败，已回退为空通讯录：${err.message}`);
        const backup = `${this.file}.broken-${Date.now()}`;
        try { fs.copyFileSync(this.file, backup); console.error(`[store] 原文件已备份到 ${backup}`); } catch (_) { /* ignore */ }
      }
      this.db = { version: 1, updatedAt: null, contacts: [] };
      this.persist();
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.db.updatedAt = new Date().toISOString();
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  all() {
    return this.db.contacts;
  }

  find(id) {
    return this.db.contacts.find((c) => c.id === id) || null;
  }

  /**
   * 条件查询 + 排序 + 分页。
   * keyword 会匹配姓名、公司、部门、职位、标签、备注以及所有联系方式的值。
   */
  query({
    keyword = '',
    bookmarked,
    tag = '',
    sort = 'updated',
    page = 1,
    pageSize = 12,
    paginate = true,
  } = {}) {
    const kw = String(keyword).trim().toLowerCase();
    const onlyBookmarked = bookmarked === true || bookmarked === 'true' || bookmarked === '1';
    let rows = this.all().filter((c) => {
      if (onlyBookmarked && !c.bookmarked) return false;
      if (tag && !(c.tags || []).includes(tag)) return false;
      if (!kw) return true;
      const haystack = [
        c.name, c.company, c.department, c.title, c.note,
        (c.tags || []).join(' '),
        (c.contactMethods || []).map((m) => `${m.label} ${m.value}`).join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(kw);
    });

    const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN');
    rows.sort((a, b) => {
      switch (sort) {
        case 'name': return byName(a, b);
        case 'created': return String(b.createdAt).localeCompare(String(a.createdAt));
        case 'bookmark': return (Number(b.bookmarked) - Number(a.bookmarked)) || byName(a, b);
        case 'updated':
        default: return String(b.updatedAt).localeCompare(String(a.updatedAt));
      }
    });

    const total = rows.length;
    if (paginate) {
      const size = Math.min(Math.max(Number(pageSize) || 12, 1), 200);
      const p = Math.max(Number(page) || 1, 1);
      rows = rows.slice((p - 1) * size, p * size);
      return { rows, total, page: p, pageSize: size };
    }
    return { rows, total, page: 1, pageSize: total || 1 };
  }

  create(input) {
    const { contact, errors } = sanitizeContact(input);
    if (errors.length) return { contact: null, errors };
    this.db.contacts.unshift(contact);
    this.persist();
    return { contact, errors: [] };
  }

  update(id, input) {
    const existing = this.find(id);
    if (!existing) return { contact: null, errors: ['联系人不存在'] };
    const { contact, errors } = sanitizeContact(input, { existing });
    if (errors.length) return { contact: null, errors };
    this.db.contacts[this.db.contacts.indexOf(existing)] = contact;
    this.persist();
    return { contact, errors: [] };
  }

  remove(id) {
    const idx = this.db.contacts.findIndex((c) => c.id === id);
    if (idx < 0) return false;
    this.db.contacts.splice(idx, 1);
    this.persist();
    return true;
  }

  setBookmark(id, bookmarked) {
    const c = this.find(id);
    if (!c) return null;
    c.bookmarked = Boolean(bookmarked);
    c.updatedAt = new Date().toISOString();
    this.persist();
    return c;
  }

  /** 批量收藏 / 取消收藏 / 删除 */
  bulk(ids, action) {
    const set = new Set(Array.isArray(ids) ? ids.map(String) : []);
    let affected = 0;
    if (action === 'delete') {
      const before = this.db.contacts.length;
      this.db.contacts = this.db.contacts.filter((c) => !set.has(c.id));
      affected = before - this.db.contacts.length;
    } else if (action === 'bookmark' || action === 'unbookmark') {
      const value = action === 'bookmark';
      for (const c of this.db.contacts) {
        if (set.has(c.id)) {
          c.bookmarked = value;
          c.updatedAt = new Date().toISOString();
          affected += 1;
        }
      }
    } else {
      return { affected: 0, error: '不支持的批量操作' };
    }
    if (affected) this.persist();
    return { affected };
  }

  tags() {
    const counts = new Map();
    for (const c of this.all()) {
      for (const t of c.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
  }

  stats() {
    const contacts = this.all();
    return {
      total: contacts.length,
      bookmarked: contacts.filter((c) => c.bookmarked).length,
      methods: contacts.reduce((n, c) => n + (c.contactMethods || []).length, 0),
      tags: this.tags().length,
    };
  }

  /**
   * 导入提交。
   * duplicate: append(默认 全部新增) | skip(同名跳过) | merge(同名合并联系方式)
   */
  commit(contacts, duplicate = 'append') {
    const report = { total: contacts.length, created: 0, updated: 0, skipped: 0, errors: [] };
    const byName = new Map(this.all().map((c) => [String(c.name).trim(), c]));

    for (const [index, raw] of contacts.entries()) {
      const { contact, errors } = sanitizeContact(raw);
      if (errors.length || !contact) {
        report.skipped += 1;
        report.errors.push({ row: index + 2, reason: errors.join('；') || '数据不合法' });
        continue;
      }

      if (duplicate === 'skip' && byName.has(contact.name)) {
        report.skipped += 1;
        continue;
      }

      if (duplicate === 'merge' && byName.has(contact.name)) {
        const target = byName.get(contact.name);
        const merged = sanitizeMethods([
          ...(target.contactMethods || []),
          ...(contact.contactMethods || []),
        ]).filter((m, i, arr) => arr.findIndex((x) => `${x.type}:${x.value}` === `${m.type}:${m.value}`) === i);
        target.contactMethods = merged;
        for (const key of ['company', 'department', 'title', 'birthday', 'note']) {
          if (!target[key] && contact[key]) target[key] = contact[key];
        }
        target.tags = [...new Set([...(target.tags || []), ...(contact.tags || [])])];
        if (contact.bookmarked) target.bookmarked = true;
        target.updatedAt = new Date().toISOString();
        report.updated += 1;
        continue;
      }

      this.db.contacts.unshift(contact);
      byName.set(contact.name, contact);
      report.created += 1;
    }
    if (report.created || report.updated) this.persist();
    return report;
  }
}

module.exports = new ContactStore();
