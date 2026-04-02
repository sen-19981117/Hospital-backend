const { HTTP_CODE } = require('../config/constants');

/**
 * 统一响应格式
 */
class Response {
  /**
   * 成功响应
   */
  static success(res, data = null, message = 'success') {
    return res.json({
      code: HTTP_CODE.SUCCESS,
      message,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 错误响应
   */
  static error(res, message = 'error', code = HTTP_CODE.SERVER_ERROR, statusCode = 500) {
    return res.status(statusCode).json({
      code,
      message,
      data: null,
      timestamp: Date.now()
    });
  }

  /**
   * 分页响应
   */
  static page(res, list, total, page, pageSize) {
    return res.json({
      code: HTTP_CODE.SUCCESS,
      message: 'success',
      data: {
        list,
        total,
        page,
        pageSize
      },
      timestamp: Date.now()
    });
  }

  /**
   * 参数错误
   */
  static badRequest(res, message = '参数错误') {
    return this.error(res, message, HTTP_CODE.BAD_REQUEST, 400);
  }

  /**
   * 未授权
   */
  static unauthorized(res, message = '未授权') {
    return this.error(res, message, HTTP_CODE.UNAUTHORIZED, 401);
  }

  /**
   * 无权限
   */
  static forbidden(res, message = '无权限') {
    return this.error(res, message, HTTP_CODE.FORBIDDEN, 403);
  }

  /**
   * 资源不存在
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, HTTP_CODE.NOT_FOUND, 404);
  }

  /**
   * 业务逻辑错误
   */
  static unprocessable(res, message = '操作失败') {
    return this.error(res, message, HTTP_CODE.UNPROCESSABLE, 422);
  }
}

module.exports = Response;
