const userService = require('../services/user.service');
const Response = require('../utils/response');

class UserController {
  /**
   * 获取用户列表
   */
  async getUserList(req, res, next) {
    try {
      const result = await userService.getUserList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      if (!user) {
        return Response.notFound(res, '用户不存在');
      }
      return Response.success(res, user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建用户
   */
  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      return Response.success(res, user, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新用户
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.updateUser(id, req.body);
      return Response.success(res, user, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 修改用户状态
   */
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await userService.updateUserStatus(id, status);
      return Response.success(res, null, status === 1 ? '已启用' : '已禁用');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 修改用户角色
   */
  async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { roleId } = req.body;
      const user = await userService.updateUserRole(id, roleId);
      return Response.success(res, user, '角色分配成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      await userService.resetPassword(id, password);
      return Response.success(res, null, '密码重置成功');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
