const express = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { scheduleValidation, paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取排班列表
router.get('/', permissionMiddleware('schedule:view'), paginationValidation, scheduleController.getScheduleList);

// 获取号源列表（用于挂号选择）
router.get('/slots', permissionMiddleware('slot:view'), scheduleController.getSlotList);

// 获取排班详情
router.get('/:id', permissionMiddleware('schedule:view'), scheduleController.getScheduleById);

// 创建排班
router.post('/', permissionMiddleware('schedule:add'), scheduleValidation.create, scheduleController.createSchedule);

// 更新排班
router.put('/:id', permissionMiddleware('schedule:edit'), scheduleValidation.update, scheduleController.updateSchedule);

// 删除排班
router.delete('/:id', permissionMiddleware('schedule:delete'), scheduleController.deleteSchedule);

// 修改排班状态（停诊/恢复）
router.put('/:id/status', permissionMiddleware('schedule:edit'), scheduleController.updateScheduleStatus);

module.exports = router;
