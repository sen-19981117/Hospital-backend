const menuService = require('../services/menu.service');
const Response = require('../utils/response');

class MenuController {
  /**
   * 获取菜单列表
   */
  async getMenuList(req, res, next) {
    try {
      const menus = await menuService.getMenuList();
      return Response.success(res, menus);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取菜单树
   */
  async getMenuTree(req, res, next) {
    try {
      const tree = await menuService.getMenuTree();
      return Response.success(res, tree);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取菜单
   */
  async getMenuById(req, res, next) {
    try {
      const { id } = req.params;
      const menu = await menuService.getMenuById(id);
      if (!menu) {
        return Response.notFound(res, '菜单不存在');
      }
      return Response.success(res, menu);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建菜单
   */
  async createMenu(req, res, next) {
    try {
      const menu = await menuService.createMenu(req.body);
      return Response.success(res, menu, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新菜单
   */
  async updateMenu(req, res, next) {
    try {
      const { id } = req.params;
      const menu = await menuService.updateMenu(id, req.body);
      return Response.success(res, menu, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除菜单
   */
  async deleteMenu(req, res, next) {
    try {
      const { id } = req.params;
      await menuService.deleteMenu(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MenuController();
