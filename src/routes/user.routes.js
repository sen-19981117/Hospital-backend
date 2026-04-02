const express = require('express');
const userController = require('../controllers/user.controller');
const { userValidation, paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表
router.get('/', permissionMiddleware('user:view'), paginationValidation, userController.getUserList);

// 获取用户详情
router.get('/:id', permissionMiddleware('user:view'), userController.getUserById);

// 创建用户
router.post('/', permissionMiddleware('user:add'), userValidation.create, userController.createUser);

// 更新用户
router.put('/:id', permissionMiddleware('user:edit'), userValidation.update, userController.updateUser);

// 删除用户
router.delete('/:id', permissionMiddleware('user:delete'), userController.deleteUser);

// 修改用户状态
router.put('/:id/status', permissionMiddleware('user:edit'), userController.updateUserStatus);

// 分配角色
router.put('/:id/role', permissionMiddleware('user:edit'), userController.updateUserRole);

// 重置密码
router.put('/:id/password', permissionMiddleware('user:edit'), userController.resetPassword);

module.exports = router;
