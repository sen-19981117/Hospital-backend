const scheduleService = require('../services/schedule.service');
const Response = require('../utils/response');

class ScheduleController {
  /**
   * 获取排班列表
   */
  async getScheduleList(req, res, next) {
    try {
      const result = await scheduleService.getScheduleList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取号源列表（用于挂号）
   */
  async getSlotList(req, res, next) {
    try {
      const slots = await scheduleService.getSlotList(req.query);
      return Response.success(res, slots);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据ID获取排班
   */
  async getScheduleById(req, res, next) {
    try {
      const { id } = req.params;
      const schedule = await scheduleService.getScheduleById(id);
      if (!schedule) {
        return Response.notFound(res, '排班不存在');
      }
      return Response.success(res, schedule);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建排班
   */
  async createSchedule(req, res, next) {
    try {
      const schedule = await scheduleService.createSchedule(req.body);
      return Response.success(res, schedule, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新排班
   */
  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const schedule = await scheduleService.updateSchedule(id, req.body);
      return Response.success(res, schedule, '更新成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除排班
   */
  async deleteSchedule(req, res, next) {
    try {
      const { id } = req.params;
      await scheduleService.deleteSchedule(id);
      return Response.success(res, null, '删除成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 修改排班状态（停诊/恢复）
   */
  async updateScheduleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await scheduleService.updateScheduleStatus(id, status);
      return Response.success(res, null, status === 1 ? '已恢复' : '已停诊');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ScheduleController();
