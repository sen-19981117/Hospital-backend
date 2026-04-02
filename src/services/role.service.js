const { dbAsync } = require('../config/database');
const { menuIdMatches } = require('../utils/user-role');

class RoleService {
  /**
   * 获取角色列表
   */
  async getRoleList(params) {
    const { keyword, page = 1, pageSize = 10 } = params;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (keyword) {
      whereClause += ' AND (role_name LIKE ? OR role_key LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 查询总数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM roles ${whereClause}`,
      queryParams
    );
    const total = countResult.total;

    // 查询列表
    const offset = (page - 1) * pageSize;
    const list = await dbAsync.all(
      `SELECT id, role_name, role_key, remark, status, create_time
       FROM roles
       ${whereClause}
       ORDER BY id
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(pageSize), parseInt(offset)]
    );

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 获取所有角色（不分页）
   */
  async getAllRoles() {
    return await dbAsync.all(
      'SELECT id, role_name, role_key FROM roles WHERE status = 1 ORDER BY id'
    );
  }

  /**
   * 根据ID获取角色
   */
  async getRoleById(id) {
    const role = await dbAsync.get(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );

    if (!role) {
      return null;
    }

    const roleMenus = await dbAsync.all(
      `SELECT menu_id FROM role_menus WHERE role_id = ?`,
      [id]
    );
    const menuIds = (roleMenus || []).map((rm) => rm.menu_id);
    const allMenus = await dbAsync.all(
      `SELECT id, menu_name, permission, menu_type FROM menus WHERE status = 1`,
      []
    );
    const menus = allMenus.filter((m) => menuIdMatches(menuIds, m.id));

    return {
      ...role,
      menus: menus.map((m) => m.id)
    };
  }

  /**
   * 创建角色
   * 同时支持 snake_case（前端常用）与 camelCase
   */
  async createRole(data) {
    const roleName = data.role_name ?? data.roleName;
    const roleKey = data.role_key ?? data.roleKey;
    const remark = data.remark ?? data.description ?? null;
    const status =
      data.status !== undefined && data.status !== null ? data.status : 1;

    if (!roleName || String(roleName).trim() === '') {
      throw new Error('角色名称不能为空');
    }
    if (!roleKey || String(roleKey).trim() === '') {
      throw new Error('角色标识不能为空');
    }

    // 检查角色标识是否已存在
    const existing = await dbAsync.get(
      'SELECT id FROM roles WHERE role_key = ?',
      [roleKey]
    );

    if (existing) {
      throw new Error('角色标识已存在');
    }

    const result = await dbAsync.run(
      `INSERT INTO roles (role_name, role_key, remark, status) 
       VALUES (?, ?, ?, ?)`,
      [roleName, roleKey, remark, status]
    );

    return this.getRoleById(result.id);
  }

  /**
   * 更新角色
   * 同时支持 snake_case 与 camelCase
   */
  async updateRole(id, data) {
    const roleName =
      data.role_name !== undefined ? data.role_name : data.roleName;
    const remark =
      data.remark !== undefined
        ? data.remark
        : data.description !== undefined
          ? data.description
          : undefined;
    const { status } = data;

    // 检查角色是否存在
    const role = await dbAsync.get('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      throw new Error('角色不存在');
    }

    // 不能修改内置角色标识
    const updates = [];
    const params = [];

    if (roleName !== undefined) {
      updates.push('role_name = ?');
      params.push(roleName);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      params.push(remark);
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
      `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getRoleById(id);
  }

  /**
   * 删除角色
   */
  async deleteRole(id) {
    // 检查角色是否存在
    const role = await dbAsync.get('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      throw new Error('角色不存在');
    }

    // 不能删除内置角色
    if (['admin', 'manager', 'nurse', 'doctor'].includes(role.role_key)) {
      throw new Error('不能删除系统内置角色');
    }

    // 检查是否有用户使用该角色
    const userCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
      [id]
    );

    if (userCount.count > 0) {
      throw new Error('该角色已被用户使用，不能删除');
    }

    // 删除角色菜单关联
    await dbAsync.run('DELETE FROM role_menus WHERE role_id = ?', [id]);

    // 删除角色
    await dbAsync.run('DELETE FROM roles WHERE id = ?', [id]);

    return true;
  }

  /**
   * 分配角色菜单权限
   */
  async assignRoleMenus(roleId, menuIds) {
    // 检查角色是否存在
    const role = await dbAsync.get('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      throw new Error('角色不存在');
    }

    // 删除原有权限
    await dbAsync.run('DELETE FROM role_menus WHERE role_id = ?', [roleId]);

    // JSON 模拟库 run() 仅支持单行 INSERT；多行 VALUES 只会写入第一条。逐条插入。
    if (menuIds && menuIds.length > 0) {
      const seen = new Set();
      for (const raw of menuIds) {
        const menuId = Number(raw);
        if (!Number.isFinite(menuId) || menuId <= 0 || seen.has(menuId)) continue;
        seen.add(menuId);
        await dbAsync.run(
          'INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)',
          [roleId, menuId]
        );
      }
    }

    return true;
  }

  /**
   * 获取角色的菜单ID列表
   */
  async getRoleMenuIds(roleId) {
    const menus = await dbAsync.all(
      'SELECT menu_id FROM role_menus WHERE role_id = ?',
      [roleId]
    );
    return menus.map((m) => Number(m.menu_id)).filter((id) => Number.isFinite(id));
  }
}

module.exports = new RoleService();
