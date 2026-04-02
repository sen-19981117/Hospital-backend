const authService = require('../services/auth.service');
const Response = require('../utils/response');

class AuthController {
  /**
   * 用户登录
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      return Response.success(res, result, '登录成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 用户登出
   */
  async logout(req, res, next) {
    try {
      // JWT 无状态，客户端清除 token 即可
      return Response.success(res, null, '登出成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getUserInfo(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await authService.getUserInfo(userId);
      return Response.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取当前用户菜单
   */
  async getUserMenus(req, res, next) {
    try {
      const { roleId } = req.user;
      const menus = await authService.getUserMenus(roleId);
      return Response.success(res, menus);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取当前用户权限
   */
  async getUserPermissions(req, res, next) {
    try {
      const { roleId } = req.user;
      const permissions = await authService.getUserPermissions(roleId);
      return Response.success(res, permissions);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
