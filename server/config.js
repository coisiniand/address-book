'use strict';

const path = require('path');

/** 全局配置：全部支持环境变量覆盖，方便云服务器部署 */
module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DATA_FILE: process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'contacts.json'),
  /** Excel 上传体积上限（字节） */
  MAX_UPLOAD_SIZE: Number(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024,
  /** 单次导出/导入的最大行数 */
  MAX_ROWS: 20000,
};
