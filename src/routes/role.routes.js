const express = require('express');
const roleController = require('../controllers/role.controller');
const { paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取角色列表
router.get('/', permissionMiddleware('role:view'), paginationValidation, roleController.getRoleList);

// 获取所有角色（不分页）
router.get('/all', permissionMiddleware('role:view'), roleController.getAllRoles);

// 获取角色详情
router.get('/:id', permissionMiddleware('role:view'), roleController.getRoleById);

// 创建角色
router.post('/', permissionMiddleware('role:add'), roleController.createRole);

// 更新角色
router.put('/:id', permissionMiddleware('role:edit'), roleController.updateRole);

// 删除角色
router.delete('/:id', permissionMiddleware('role:delete'), roleController.deleteRole);

// 分配菜单权限
router.get('/:id/menus', permissionMiddleware('role:view'), roleController.getRoleMenus);
router.put('/:id/menus', permissionMiddleware('role:edit'), roleController.assignRoleMenus);

module.exports = router;
