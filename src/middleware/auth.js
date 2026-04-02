const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const { dbAsync } = require('../config/database');
const { attachRoleFields, menuIdMatches } = require('../utils/user-role');

/**
 * JWT 认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.unauthorized(res, '请先登录');
    }

    const token = authHeader.split(' ')[1];
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userRow = await dbAsync.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    const user = await attachRoleFields(userRow);

    if (!user) {
      return Response.unauthorized(res, '用户不存在');
    }

    if (user.status === 0) {
      return Response.forbidden(res, '用户已被禁用');
    }

    req.user = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      roleId: user.role_id,
      roleKey: user.role_key,
      roleName: user.role_name
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return Response.unauthorized(res, '登录已过期，请重新登录');
    }
    if (err.name === 'JsonWebTokenError') {
      return Response.unauthorized(res, '无效的登录凭证');
    }
    return Response.unauthorized(res, '认证失败');
  }
};

/**
 * 权限检查中间件
 * @param {string|Array} permissions - 需要的权限
 */
const permissionMiddleware = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return Response.unauthorized(res, '请先登录');
      }

      // 超级管理员拥有所有权限
      if (req.user.roleKey === 'admin') {
        return next();
      }

      // 将权限转为数组
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      // 获取角色关联的菜单ID
      const roleMenus = await dbAsync.all(
        `SELECT menu_id FROM role_menus WHERE role_id = ?`,
        [req.user.roleId]
      );
      
      if (!roleMenus || roleMenus.length === 0) {
        return Response.forbidden(res, '无权限执行此操作');
      }
      
      const menuIds = roleMenus.map(rm => rm.menu_id);
      
      // 获取所有菜单
      const allMenus = await dbAsync.all(`SELECT * FROM menus`, []);
      
      // 提取用户权限
      const userPermissionList = allMenus
        .filter((m) => menuIdMatches(menuIds, m.id))
        .filter(m => m.permission && m.permission.trim() !== '')
        .map(m => m.permission);
      
      // 检查是否拥有所需权限
      const hasPermission = requiredPermissions.some(p => userPermissionList.includes(p));
      
      if (!hasPermission) {
        return Response.forbidden(res, '无权限执行此操作');
      }

      next();
    } catch (err) {
      console.error('权限检查失败:', err);
      return Response.error(res, '权限检查失败');
    }
  };
};

/**
 * 角色检查中间件
 * @param {string|Array} roles - 允许的角色
 */
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return Response.unauthorized(res, '请先登录');
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.roleKey)) {
      return Response.forbidden(res, '无权限执行此操作');
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  permissionMiddleware,
  roleMiddleware
};
