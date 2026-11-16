'use strict';

/** 统一成功响应：{ code: 0, data, message } */
function ok(res, data, message = 'ok', status = 200) {
  return res.status(status).json({ code: 0, message, data });
}

/** 统一失败响应：{ code: 非0, message, data: null } */
function fail(res, message = '请求失败', status = 400, code = status) {
  return res.status(status).json({ code, message, data: null });
}

/** 包裹 async 路由，避免每个 handler 手写 try/catch */
function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { ok, fail, wrap };
