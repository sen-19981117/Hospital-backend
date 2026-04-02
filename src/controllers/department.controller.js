const departmentService = require('../services/department.service');
const Response = require('../utils/response');

class DepartmentController {
  /**
   * 获取科室列表
   */
  async getDepartmentList(req, res, next) {
    try {
      const result = await departmentService.getDepartmentList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取所有科室
   */
  async getAllDepartments(req, res, next) {
    try {
      const departments = await departmentService.getAllDepartments();
      return Response.success(res, departments);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取科室
   */
  async getDepartmentById(req, res, next) {
    try {
      const { id } = req.params;
      const department = await departmentService.getDepartmentById(id);
      if (!department) {
        return Response.notFound(res, '科室不存在');
      }
      return Response.success(res, department);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建科室
   */
  async createDepartment(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body);
      return Response.success(res, department, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新科室
   */
  async updateDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const department = await departmentService.updateDepartment(id, req.body);
      return Response.success(res, department, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除科室
   */
  async deleteDepartment(req, res, next) {
    try {
      const { id } = req.params;
      await departmentService.deleteDepartment(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 修改科室状态
   */
  async updateDepartmentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await departmentService.updateDepartmentStatus(id, status);
      return Response.success(res, null, status === 1 ? '已启用' : '已停用');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DepartmentController();
