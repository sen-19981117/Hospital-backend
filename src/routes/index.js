const express = require('express');
const { authMiddleware } = require('../middleware/auth');

// 导入各模块路由
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const menuRoutes = require('./menu.routes');
const departmentRoutes = require('./department.routes');
const doctorRoutes = require('./doctor.routes');
const scheduleRoutes = require('./schedule.routes');
const patientRoutes = require('./patient.routes');
const orderRoutes = require('./order.routes');
const statisticsRoutes = require('./statistics.routes');

const router = express.Router();

// 公开路由
router.use('/auth', authRoutes);

// 需要认证的路由
router.use('/users', authMiddleware, userRoutes);
router.use('/roles', authMiddleware, roleRoutes);
router.use('/menus', authMiddleware, menuRoutes);
router.use('/departments', authMiddleware, departmentRoutes);
router.use('/doctors', authMiddleware, doctorRoutes);
router.use('/schedules', authMiddleware, scheduleRoutes);
router.use('/patients', authMiddleware, patientRoutes);
router.use('/orders', authMiddleware, orderRoutes);
router.use('/appointments', authMiddleware, orderRoutes); // 挂号订单别名
router.use('/statistics', authMiddleware, statisticsRoutes);

module.exports = router;
