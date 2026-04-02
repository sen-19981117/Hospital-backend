const patientService = require('../services/patient.service');
const Response = require('../utils/response');

class PatientController {
  /**
   * 获取患者列表
   */
  async getPatientList(req, res, next) {
    try {
      const result = await patientService.getPatientList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取患者
   */
  async getPatientById(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientService.getPatientById(id);
      if (!patient) {
        return Response.notFound(res, '患者不存在');
      }
      return Response.success(res, patient);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建患者
   */
  async createPatient(req, res, next) {
    try {
      const patient = await patientService.createPatient(req.body);
      return Response.success(res, patient, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新患者
   */
  async updatePatient(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientService.updatePatient(id, req.body);
      return Response.success(res, patient, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除患者
   */
  async deletePatient(req, res, next) {
    try {
      const { id } = req.params;
      await patientService.deletePatient(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取患者的挂号记录
   */
  async getPatientOrders(req, res, next) {
    try {
      const { id } = req.params;
      const result = await patientService.getPatientOrders(id, req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PatientController();
