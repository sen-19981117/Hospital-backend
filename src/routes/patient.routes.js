const express = require('express');
const patientController = require('../controllers/patient.controller');
const { patientValidation, paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取患者列表
router.get('/', permissionMiddleware('patient:view'), paginationValidation, patientController.getPatientList);

// 获取患者详情
router.get('/:id', permissionMiddleware('patient:view'), patientController.getPatientById);

// 创建患者
router.post('/', permissionMiddleware('patient:add'), patientValidation.create, patientController.createPatient);

// 更新患者
router.put('/:id', permissionMiddleware('patient:edit'), patientValidation.update, patientController.updatePatient);

// 删除患者
router.delete('/:id', permissionMiddleware('patient:delete'), patientController.deletePatient);

// 获取患者的挂号记录
router.get('/:id/orders', permissionMiddleware('patient:view'), paginationValidation, patientController.getPatientOrders);

module.exports = router;
