'use strict';

const express = require('express');
const config = require('./config');
const configureApp = require('./app');

// 本地 / 云服务器：常驻进程，自己监听端口
const app = configureApp(express());

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
