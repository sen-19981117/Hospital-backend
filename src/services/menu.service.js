const { dbAsync } = require('../config/database');
const { menuIdMatches } = require('../utils/user-role');

class MenuService {
  /**
   * 获取菜单列表
   */
  async getMenuList() {
    const menus = await dbAsync.all(
      `SELECT id, menu_name, path, component, icon, parent_id, sort, 
              permission, menu_type, status, create_time
       FROM menus
       ORDER BY parent_id, sort`
    );
    return menus;
  }

  /**
   * 获取菜单树
   */
  async getMenuTree() {
    const menus = await this.getMenuList();
    return this.buildMenuTree(menus);
  }

  /**
   * 构建菜单树
   */
  buildMenuTree(menus, parentId = 0) {
    return menus
      .filter(menu => menu.parent_id === parentId)
      .map(menu => ({
        id: menu.id,
        menuName: menu.menu_name,
        path: menu.path,
        component: menu.component,
        icon: menu.icon,
        parentId: menu.parent_id,
        sort: menu.sort,
        permission: menu.permission,
        menuType: menu.menu_type,
        status: menu.status,
        createTime: menu.create_time,
        children: this.buildMenuTree(menus, menu.id)
      }));
  }

  /**
   * 根据ID获取菜单
   */
  async getMenuById(id) {
    return await dbAsync.get(
      `SELECT id, menu_name, path, component, icon, parent_id, sort, 
              permission, menu_type, status, create_time
       FROM menus
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * 创建菜单
   */
  async createMenu(data) {
    const {
      menuName,
      path = '',
      component = '',
      icon = '',
      parentId = 0,
      sort = 0,
      permission = '',
      menuType = 1,
      status = 1
    } = data;

    const result = await dbAsync.run(
      `INSERT INTO menus (menu_name, path, component, icon, parent_id, sort, permission, menu_type, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [menuName, path, component, icon, parentId, sort, permission, menuType, status]
    );

    return this.getMenuById(result.id);
  }

  /**
   * 更新菜单
   */
  async updateMenu(id, data) {
    // 检查菜单是否存在
    const menu = await this.getMenuById(id);
    if (!menu) {
      throw new Error('菜单不存在');
    }

    const {
      menuName,
      path,
      component,
      icon,
      parentId,
      sort,
      permission,
      menuType,
      status
    } = data;

    const updates = [];
    const params = [];

    if (menuName !== undefined) {
      updates.push('menu_name = ?');
      params.push(menuName);
    }
    if (path !== undefined) {
      updates.push('path = ?');
      params.push(path);
    }
    if (component !== undefined) {
      updates.push('component = ?');
      params.push(component);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    if (parentId !== undefined) {
      updates.push('parent_id = ?');
      params.push(parentId);
    }
    if (sort !== undefined) {
      updates.push('sort = ?');
      params.push(sort);
    }
    if (permission !== undefined) {
      updates.push('permission = ?');
      params.push(permission);
    }
    if (menuType !== undefined) {
      updates.push('menu_type = ?');
      params.push(menuType);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      throw new Error('没有要更新的字段');
    }

    params.push(id);

    await dbAsync.run(
      `UPDATE menus SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getMenuById(id);
  }

  /**
   * 删除菜单
   */
  async deleteMenu(id) {
    // 检查菜单是否存在
    const menu = await this.getMenuById(id);
    if (!menu) {
      throw new Error('菜单不存在');
    }

    // 检查是否有子菜单
    const children = await dbAsync.get(
      'SELECT id FROM menus WHERE parent_id = ?',
      [id]
    );

    if (children) {
      throw new Error('该菜单下存在子菜单，不能删除');
    }

    // 删除菜单
    await dbAsync.run('DELETE FROM menus WHERE id = ?', [id]);

    // 删除角色菜单关联
    await dbAsync.run('DELETE FROM role_menus WHERE menu_id = ?', [id]);

    return true;
  }

  /**
   * 获取角色的菜单树
   */
  async getRoleMenuTree(roleId) {
    const roleMenus = await dbAsync.all(
      `SELECT * FROM role_menus WHERE role_id = ?`,
      [roleId]
    );
    if (!roleMenus || roleMenus.length === 0) {
      return [];
    }
    const menuIds = roleMenus.map((rm) => rm.menu_id);
    const allMenus = await dbAsync.all(`SELECT * FROM menus WHERE status = 1`, []);
    const menus = allMenus.filter((m) => menuIdMatches(menuIds, m.id));
    menus.sort((a, b) => {
      const pa = Number(a.parent_id) || 0;
      const pb = Number(b.parent_id) || 0;
      if (pa !== pb) return pa - pb;
      return (a.sort || 0) - (b.sort || 0);
    });

    return this.buildMenuTree(menus);
  }
}

module.exports = new MenuService();
