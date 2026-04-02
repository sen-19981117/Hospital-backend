const roleService = require('../services/role.service');
const Response = require('../utils/response');

class RoleController {
  /**
   * 获取角色列表
   */
  async getRoleList(req, res, next) {
    try {
      const result = await roleService.getRoleList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取所有角色
   */
  async getAllRoles(req, res, next) {
    try {
      const roles = await roleService.getAllRoles();
      return Response.success(res, roles);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取角色
   */
  async getRoleById(req, res, next) {
    try {
      const { id } = req.params;
      const role = await roleService.getRoleById(id);
      if (!role) {
        return Response.notFound(res, '角色不存在');
      }
      return Response.success(res, role);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建角色
   */
  async createRole(req, res, next) {
    try {
      const role = await roleService.createRole(req.body);
      return Response.success(res, role, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新角色
   */
  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const role = await roleService.updateRole(id, req.body);
      return Response.success(res, role, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除角色
   */
  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;
      await roleService.deleteRole(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取角色菜单权限
   */
  async getRoleMenus(req, res, next) {
    try {
      const { id } = req.params;
      const menuIds = await roleService.getRoleMenuIds(id);
      return Response.success(res, menuIds);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 分配角色菜单权限
   */
  async assignRoleMenus(req, res, next) {
    try {
      const { id } = req.params;
      const { menuIds } = req.body;
      await roleService.assignRoleMenus(id, menuIds);
      return Response.success(res, null, '权限分配成功');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RoleController();
