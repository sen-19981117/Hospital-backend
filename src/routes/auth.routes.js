const express = require('express');
const authController = require('../controllers/auth.controller');
const { loginValidation } = require('../middleware/request-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', loginValidation, authController.login);

// 登出
router.post('/logout', authMiddleware, authController.logout);

// 获取当前用户信息
router.get('/info', authMiddleware, authController.getUserInfo);

// 获取当前用户菜单
router.get('/menus', authMiddleware, authController.getUserMenus);

// 获取当前用户权限
router.get('/permissions', authMiddleware, authController.getUserPermissions);

module.exports = router;
