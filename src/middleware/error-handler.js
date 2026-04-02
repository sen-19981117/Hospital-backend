const Response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id
  });

  // 处理特定类型的错误
  if (err.name === 'ValidationError') {
    return Response.badRequest(res, err.message);
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return Response.error(res, '数据已存在', 409, 409);
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return Response.error(res, '关联数据不存在', 400, 400);
  }

  // 默认服务器错误
  return Response.error(res, err.message || '服务器内部错误');
};

/**
 * 404 处理中间件
 */
const notFoundHandler = (req, res) => {
  return Response.notFound(res, '接口不存在');
};

module.exports = {
  errorHandler,
  notFoundHandler
};
