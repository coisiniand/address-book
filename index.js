'use strict';

/**
 * Vercel 入口（官方 Express 零配置约定）。
 *
 * 官方文档要求：在项目根目录的 index.js 中引入 express 并把 app 作为默认导出，
 * Vercel 会把整个 Express 应用编译成单个 Function；public/** 由 CDN 自动托管，
 * 因此本项目不需要 vercel.json，也不在这里调用 app.listen()。
 *
 * 与本地运行（server/index.js）的区别只在于：
 * 1) Serverless 文件系统只读，数据文件改用 os.tmpdir()；
 * 2) Function 请求体上限 4.5 MB，Excel 上传上限相应收紧；
 * 3) 只导出 app，不监听端口。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

// Vercel Function 只有 os.tmpdir()（Linux 上即 /tmp）可写且不能在实例间共享。
// 冷启动时用仓库内的演示数据初始化一份，避免 persist() 抛 EROFS。
const dataFile = path.join(os.tmpdir(), 'ee308fz-contacts.json');
if (!fs.existsSync(dataFile)) {
  const seed = require('./data/contacts.json'); // 静态 require，确保被打包进 Function
  fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2), 'utf8');
}
process.env.DATA_FILE = dataFile;

// Vercel Function 的请求/响应体硬上限为 4.5 MB，Excel 上传收紧到 4 MB
process.env.MAX_UPLOAD_SIZE = String(4 * 1024 * 1024);

// 环境变量必须在加载 app 之前设置：server/config.js 在模块初始化时读取 process.env
const configureApp = require('./server/app');

module.exports = configureApp(express());
