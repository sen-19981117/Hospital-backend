const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const { doctorValidation, paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取医生列表
router.get('/', permissionMiddleware('doctor:view'), paginationValidation, doctorController.getDoctorList);

// 获取所有医生（不分页）
router.get('/all', permissionMiddleware('doctor:view'), doctorController.getAllDoctors);

// 获取医生详情
router.get('/:id', permissionMiddleware('doctor:view'), doctorController.getDoctorById);

// 创建医生
router.post('/', permissionMiddleware('doctor:add'), doctorValidation.create, doctorController.createDoctor);

// 更新医生
router.put('/:id', permissionMiddleware('doctor:edit'), doctorValidation.update, doctorController.updateDoctor);

// 删除医生
router.delete('/:id', permissionMiddleware('doctor:delete'), doctorController.deleteDoctor);

// 修改医生状态
router.put('/:id/status', permissionMiddleware('doctor:edit'), doctorController.updateDoctorStatus);

module.exports = router;
