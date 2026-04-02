const doctorService = require('../services/doctor.service');
const Response = require('../utils/response');

class DoctorController {
  /**
   * 获取医生列表
   */
  async getDoctorList(req, res, next) {
    try {
      const result = await doctorService.getDoctorList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取所有医生
   */
  async getAllDoctors(req, res, next) {
    try {
      const { departmentId } = req.query;
      const doctors = await doctorService.getAllDoctors(departmentId);
      return Response.success(res, doctors);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取医生
   */
  async getDoctorById(req, res, next) {
    try {
      const { id } = req.params;
      const doctor = await doctorService.getDoctorById(id);
      if (!doctor) {
        return Response.notFound(res, '医生不存在');
      }
      return Response.success(res, doctor);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建医生
   */
  async createDoctor(req, res, next) {
    try {
      const doctor = await doctorService.createDoctor(req.body);
      return Response.success(res, doctor, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新医生
   */
  async updateDoctor(req, res, next) {
    try {
      const { id } = req.params;
      const doctor = await doctorService.updateDoctor(id, req.body);
      return Response.success(res, doctor, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除医生
   */
  async deleteDoctor(req, res, next) {
    try {
      const { id } = req.params;
      await doctorService.deleteDoctor(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 修改医生状态
   */
  async updateDoctorStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await doctorService.updateDoctorStatus(id, status);
      return Response.success(res, null, status === 1 ? '已启用' : '已停诊');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DoctorController();
