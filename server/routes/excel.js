'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const store = require('../store');
const { ok, fail, wrap } = require('../utils/response');
const excel = require('../services/excel');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.xlsx') return cb(null, true);
    if (ext === '.xls') return cb(new Error('旧版 .xls 暂不支持，请用 Excel 另存为 .xlsx 后再导入'));
    return cb(new Error('只支持 .xlsx 格式的 Excel 文件'));
  },
});

/** 把筛选条件同时用于列表与导出，保证"导出所见即所得" */
function filterFromQuery(query) {
  return {
    keyword: query.keyword || '',
    bookmarked: query.bookmarked,
    tag: query.tag || '',
    sort: query.sort || 'updated',
    paginate: false,
  };
}

/** GET /api/excel/export —— 导出当前筛选结果为 .xlsx */
router.get('/export', wrap(async (req, res) => {
  const { rows } = store.query(filterFromQuery(req.query));
  const workbook = excel.buildWorkbook(rows);
  await excel.sendWorkbook(res, workbook, excel.exportFileName());
}));

/** GET /api/excel/template —— 下载标准导入模板（含示例与填写说明） */
router.get('/template', wrap(async (req, res) => {
  const workbook = excel.buildTemplateWorkbook();
  await excel.sendWorkbook(res, workbook, excel.templateFileName());
}));

/**
 * POST /api/excel/preview —— 上传 Excel，仅解析不入库。
 * 返回解析后的联系人数组供前端预览，用户确认后再调用 /commit。
 */
router.post('/preview', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return fail(res, '请选择要导入的 .xlsx 文件');
  const parsed = await excel.parseWorkbook(req.file.buffer);
  return ok(res, {
    ...parsed,
    fileName: req.file.originalname,
    size: req.file.size,
  }, `解析完成：识别到 ${parsed.contacts.length} 条记录`);
}));

/** POST /api/excel/commit —— 确认导入（append / skip / merge） */
router.post('/commit', wrap((req, res) => {
  const { contacts, duplicate = 'append' } = req.body || {};
  if (!Array.isArray(contacts)) return fail(res, '缺少待导入的数据，请先上传文件预览');
  if (contacts.length > config.MAX_ROWS) return fail(res, `单次最多导入 ${config.MAX_ROWS} 条`);
  if (!['append', 'skip', 'merge'].includes(duplicate)) return fail(res, '无效的重复处理策略');
  const report = store.commit(contacts, duplicate);
  return ok(res, report, `导入完成：新增 ${report.created}，更新 ${report.updated}，跳过 ${report.skipped}`);
}));

module.exports = router;
