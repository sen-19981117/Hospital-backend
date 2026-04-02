const statisticsService = require('../services/statistics.service');
const Response = require('../utils/response');

class StatisticsController {
  /**
   * 获取今日统计
   */
  async getTodayStatistics(req, res, next) {
    try {
      const stats = await statisticsService.getTodayStatistics();
      return Response.success(res, stats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取近7天挂号趋势
   */
  async getWeeklyTrend(req, res, next) {
    try {
      const trend = await statisticsService.getWeeklyTrend();
      return Response.success(res, trend);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取科室挂号排行
   */
  async getDepartmentRanking(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const ranking = await statisticsService.getDepartmentRanking(parseInt(limit));
      return Response.success(res, ranking);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取医生挂号排行
   */
  async getDoctorRanking(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const ranking = await statisticsService.getDoctorRanking(parseInt(limit));
      return Response.success(res, ranking);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取仪表盘数据（综合）
   */
  async getDashboardData(req, res, next) {
    try {
      const data = await statisticsService.getDashboardData();
      return Response.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取日期范围统计
   */
  async getStatisticsByDateRange(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return Response.badRequest(res, '请提供开始日期和结束日期');
      }
      const stats = await statisticsService.getStatisticsByDateRange(startDate, endDate);
      return Response.success(res, stats);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StatisticsController();
