const express = require('express');
const menuController = require('../controllers/menu.controller');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取菜单列表
router.get('/', permissionMiddleware('menu:view'), menuController.getMenuList);

// 获取菜单树（菜单管理需 menu:view；角色分配权限页仅需 role:view）
router.get(
  '/tree',
  permissionMiddleware(['menu:view', 'role:view']),
  menuController.getMenuTree
);

// 获取菜单详情
router.get('/:id', permissionMiddleware('menu:view'), menuController.getMenuById);

// 创建菜单
router.post('/', permissionMiddleware('menu:add'), menuController.createMenu);

// 更新菜单
router.put('/:id', permissionMiddleware('menu:edit'), menuController.updateMenu);

// 删除菜单
router.delete('/:id', permissionMiddleware('menu:delete'), menuController.deleteMenu);

module.exports = router;
