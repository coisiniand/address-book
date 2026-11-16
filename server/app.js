'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');
const config = require('./config');
const { fail } = require('./utils/response');
const contactsRouter = require('./routes/contacts');
const excelRouter = require('./routes/excel');

/**
 * 把中间件与路由注册到传入的 Express 实例，并原样返回 app。
 *
 * 之所以把「构建 app」和「监听端口」拆开：
 * - 本地运行由 server/index.js 调用 app.listen()；
 * - Vercel 等 Serverless 平台需要直接拿到 app 作为函数 handler，不能自己 listen。
 * 两条路径共用这一份配置，避免出现两套不一致的路由。
 */
module.exports = function configureApp(app) {
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

  // 本地由同一个 Express 进程托管静态页面；Vercel 会忽略这一行，
  // 改为由 CDN 直接托管 public/** 目录（官方要求静态资源必须放在 public/）。
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

  return app;
};
