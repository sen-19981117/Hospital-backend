const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../config/database');
const { attachRoleFields, menuIdMatches } = require('../utils/user-role');

class AuthService {
  /**
   * 用户登录
   */
  async login(username, password) {
    // 仅用 username 占位：JSON 模拟库对 AND status = 1（字面量）不会过滤，禁用用户仍会被查出
    const userRow = await dbAsync.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!userRow) {
      throw new Error('用户名或密码错误');
    }

    if (Number(userRow.status) !== 1) {
      throw new Error('账号已被禁用，无法登录');
    }

    const user = await attachRoleFields(userRow);

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成 JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roleId: user.role_id,
        roleKey: user.role_key
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // 获取用户菜单和权限
    const menus = await this.getUserMenus(user.role_id);
    const permissions = await this.getUserPermissions(user.role_id);

    return {
      token,
      userInfo: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        avatar: user.avatar,
        roleId: user.role_id,
        roleName: user.role_name,
        roleKey: user.role_key
      },
      menus,
      permissions
    };
  }

  /**
   * 获取用户菜单（角色直接分配的菜单 + 祖先目录，便于组树且不暴露未分配的兄弟节点）
   * 注意：JSON 模拟库在 JOIN role_menus 后会把字段打成 role_menu_* 前缀，WHERE rm.role_id 会误匹配 item.role_id 导致结果恒为空，故不用 JOIN。
   */
  async getUserMenus(roleId) {
    const roleMenus = await dbAsync.all(
      `SELECT * FROM role_menus WHERE role_id = ?`,
      [roleId]
    );
    if (!roleMenus || roleMenus.length === 0) {
      return [];
    }
    const menuIds = roleMenus.map((rm) => rm.menu_id);
    const allMenus = await dbAsync.all(`SELECT * FROM menus WHERE status = 1`, []);
    const direct = allMenus.filter((m) => menuIdMatches(menuIds, m.id));

    const idKey = (id) => (id === '' || id == null ? '' : String(id));
    const byId = new Map();
    for (const m of direct) {
      byId.set(idKey(m.id), m);
    }
    const merged = [...direct];
    let frontier = [...direct];

    while (frontier.length > 0) {
      const m = frontier.pop();
      const pid = m.parent_id;
      if (pid == null || pid === '' || Number(pid) === 0) continue;
      if (byId.has(idKey(pid))) continue;
      const parent = await dbAsync.get(
        'SELECT * FROM menus WHERE id = ? AND status = 1',
        [pid]
      );
      if (!parent) continue;
      byId.set(idKey(parent.id), parent);
      merged.push(parent);
      frontier.push(parent);
    }

    merged.sort((a, b) => {
      const pa = Number(a.parent_id) || 0;
      const pb = Number(b.parent_id) || 0;
      if (pa !== pb) return pa - pb;
      return (a.sort || 0) - (b.sort || 0);
    });

    return this.buildMenuTree(merged);
  }

  /**
   * 构建菜单树
   */
  buildMenuTree(menus, parentId = 0) {
    return menus
      .filter((menu) => menu.parent_id == parentId)
      .map(menu => ({
        id: menu.id,
        name: menu.menu_name,
        path: menu.path,
        component: menu.component,
        icon: menu.icon,
        permission: menu.permission,
        menuType: menu.menu_type,
        children: this.buildMenuTree(menus, menu.id)
      }));
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(roleId) {
    // 获取角色关联的菜单ID
    const roleMenus = await dbAsync.all(
      `SELECT * FROM role_menus WHERE role_id = ?`,
      [roleId]
    );
    
    if (!roleMenus || roleMenus.length === 0) {
      return [];
    }
    
    const menuIds = roleMenus.map(rm => rm.menu_id);
    
    // 获取所有菜单
    const allMenus = await dbAsync.all(`SELECT * FROM menus WHERE status = 1`, []);
    
    // 过滤出角色拥有的菜单并提取权限
    return allMenus
      .filter((m) => menuIdMatches(menuIds, m.id))
      .filter(m => m.permission && m.permission.trim() !== '')
      .map(m => m.permission);
  }

  /**
   * 获取当前用户信息
   */
  async getUserInfo(userId) {
    const userRow = await dbAsync.get('SELECT * FROM users WHERE id = ? AND status = 1', [userId]);
    const user = await attachRoleFields(userRow);

    if (!user) {
      throw new Error('用户不存在');
    }

    // 获取权限
    const permissions = await this.getUserPermissions(user.role_id);
    const menus = await this.getUserMenus(user.role_id);

    return {
      userInfo: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        avatar: user.avatar,
        roleId: user.role_id,
        roleName: user.role_name,
        roleKey: user.role_key
      },
      permissions,
      menus
    };
  }
}

module.exports = new AuthService();
