'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');
const config = require('./config');
const { fail } = require('./utils/response');
const contactsRouter = require('./routes/contacts');
const excelRouter = require('./routes/excel');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// 简易访问日志，方便演示时截图 / 排查问题
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api/')) {
      console.log(`[${new Date().toLocaleTimeString('zh-CN')}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    }
  });
  next();
});

app.get('/api/health', (req, res) => res.json({
  code: 0,
  message: 'ok',
  data: { name: 'ee308fz-address-book', version: '1.0.0', time: new Date().toISOString() },
}));

app.use('/api/contacts', contactsRouter);
app.use('/api/excel', excelRouter);

app.use('/api', (req, res) => fail(res, `接口不存在：${req.method} ${req.originalUrl}`, 404));

// 前端为纯静态页面，由同一个 Express 进程托管，部署时只需开放一个端口
app.use(express.static(path.join(__dirname, '..', 'public'), {
  extensions: ['html'],
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
}));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? `文件超过 ${Math.round(config.MAX_UPLOAD_SIZE / 1024 / 1024)}MB 上限`
      : `文件上传失败：${err.message}`;
    return fail(res, message, 400);
  }
  if (err instanceof SyntaxError && 'body' in err) return fail(res, '请求体不是合法的 JSON', 400);
  console.error('[error]', err);
  return fail(res, err.message || '服务器内部错误', 500);
});

app.listen(config.PORT, config.HOST, () => {
  console.log('');
  console.log('  EE308FZ 通讯录 · Address Book');
  console.log('  ------------------------------------------');
  console.log(`  本机访问：  http://localhost:${config.PORT}`);
  console.log(`  监听地址：  ${config.HOST}:${config.PORT}`);
  console.log(`  数据文件：  ${config.DATA_FILE}`);
  console.log('  停止服务：  Ctrl + C');
  console.log('');
});
