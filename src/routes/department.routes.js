const express = require('express');
const departmentController = require('../controllers/department.controller');
const { departmentValidation, paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取科室列表
router.get('/', permissionMiddleware('dept:view'), paginationValidation, departmentController.getDepartmentList);

// 获取所有科室（不分页）
router.get('/all', permissionMiddleware('dept:view'), departmentController.getAllDepartments);

// 获取科室详情
router.get('/:id', permissionMiddleware('dept:view'), departmentController.getDepartmentById);

// 创建科室
router.post('/', permissionMiddleware('dept:add'), departmentValidation.create, departmentController.createDepartment);

// 更新科室
router.put('/:id', permissionMiddleware('dept:edit'), departmentValidation.update, departmentController.updateDepartment);

// 删除科室
router.delete('/:id', permissionMiddleware('dept:delete'), departmentController.deleteDepartment);

// 修改科室状态
router.put('/:id/status', permissionMiddleware('dept:edit'), departmentController.updateDepartmentStatus);

module.exports = router;
