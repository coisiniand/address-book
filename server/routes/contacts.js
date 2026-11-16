'use strict';

const express = require('express');
const store = require('../store');
const { ok, fail, wrap } = require('../utils/response');

const router = express.Router();

/** GET /api/contacts —— 列表（搜索 / 收藏筛选 / 标签筛选 / 排序 / 分页） */
router.get('/', wrap((req, res) => {
  const result = store.query({
    keyword: req.query.keyword || '',
    bookmarked: req.query.bookmarked,
    tag: req.query.tag || '',
    sort: req.query.sort || 'updated',
    page: req.query.page || 1,
    pageSize: req.query.pageSize || 12,
  });
  return ok(res, { items: result.rows, total: result.total, page: result.page, pageSize: result.pageSize });
}));

/** GET /api/contacts/stats —— 统计卡片 */
router.get('/stats', wrap((req, res) => ok(res, store.stats())));

/** GET /api/contacts/tags —— 标签云（含数量） */
router.get('/tags', wrap((req, res) => ok(res, store.tags())));

/** POST /api/contacts/bulk —— 批量收藏 / 取消收藏 / 删除 */
router.post('/bulk', wrap((req, res) => {
  const { ids, action } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return fail(res, '请先选择联系人');
  const result = store.bulk(ids, action);
  if (result.error) return fail(res, result.error);
  return ok(res, result, `已处理 ${result.affected} 位联系人`);
}));

/** POST /api/contacts —— 新建 */
router.post('/', wrap((req, res) => {
  const { contact, errors } = store.create(req.body || {});
  if (errors.length) return fail(res, errors.join('；'), 422);
  return ok(res, contact, '联系人已创建', 201);
}));

/** GET /api/contacts/:id —— 详情 */
router.get('/:id', wrap((req, res) => {
  const contact = store.find(req.params.id);
  return contact ? ok(res, contact) : fail(res, '联系人不存在', 404);
}));

/** PUT /api/contacts/:id —— 全量更新 */
router.put('/:id', wrap((req, res) => {
  const { contact, errors } = store.update(req.params.id, req.body || {});
  if (errors.length) {
    const status = errors.includes('联系人不存在') ? 404 : 422;
    return fail(res, errors.join('；'), status);
  }
  return ok(res, contact, '联系人已更新');
}));

/** PATCH /api/contacts/:id/bookmark —— 收藏/取消收藏；不传 bookmarked 时切换 */
router.patch('/:id/bookmark', wrap((req, res) => {
  const current = store.find(req.params.id);
  if (!current) return fail(res, '联系人不存在', 404);
  const next = req.body && typeof req.body.bookmarked === 'boolean'
    ? req.body.bookmarked
    : !current.bookmarked;
  return ok(res, store.setBookmark(req.params.id, next), next ? '已加入收藏' : '已取消收藏');
}));

/** DELETE /api/contacts/:id —— 删除 */
router.delete('/:id', wrap((req, res) => (
  store.remove(req.params.id)
    ? ok(res, { id: req.params.id }, '联系人已删除')
    : fail(res, '联系人不存在', 404)
)));

module.exports = router;
