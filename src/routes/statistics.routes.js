const express = require('express');
const statisticsController = require('../controllers/statistics.controller');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取今日统计
router.get('/today', permissionMiddleware('statistics:view'), statisticsController.getTodayStatistics);

// 获取近7天挂号趋势
router.get('/trend', permissionMiddleware('statistics:view'), statisticsController.getWeeklyTrend);

// 获取科室挂号排行
router.get('/department', permissionMiddleware('statistics:view'), statisticsController.getDepartmentRanking);

// 获取医生挂号排行
router.get('/doctor', permissionMiddleware('statistics:view'), statisticsController.getDoctorRanking);

// 获取仪表盘数据（综合）——工作台首页与数据大盘共用数据接口；有「首页」权限即可加载卡片
router.get(
  '/dashboard',
  permissionMiddleware(['statistics:view', 'dashboard:view']),
  statisticsController.getDashboardData
);

// 获取日期范围统计（/range 为正式路径；/date-range 为兼容旧前端或手动请求的别名）
router.get('/range', permissionMiddleware('statistics:view'), statisticsController.getStatisticsByDateRange);
router.get('/date-range', permissionMiddleware('statistics:view'), statisticsController.getStatisticsByDateRange);

module.exports = router;
