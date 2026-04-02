const { dbAsync } = require('../config/database');
const { ORDER_STATUS } = require('../config/constants');

class StatisticsService {
  /**
   * 获取今日统计
   */
  async getTodayStatistics() {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取今日所有订单
    const orders = await dbAsync.all(
      `SELECT * FROM orders WHERE date = ?`,
      [today]
    );
    
    // 计算统计数据
    const registeredOrders = orders.filter(o => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED);
    const registeredCount = registeredOrders.length;
    const registeredAmount = registeredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    
    const refundedOrders = orders.filter(o => o.status === ORDER_STATUS.REFUNDED);
    const refundedCount = refundedOrders.length;
    const refundedAmount = refundedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    
    const cancelledCount = orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length;
    const pendingCount = orders.filter(o => o.status === ORDER_STATUS.PENDING).length;

    return {
      date: today,
      registeredCount,
      registeredAmount,
      refundedCount,
      refundedAmount,
      cancelledCount,
      pendingCount,
      netIncome: registeredAmount - refundedAmount
    };
  }

  /**
   * 获取近7天挂号趋势
   */
  async getWeeklyTrend() {
    // 获取近7天的订单
    const orders = await dbAsync.all(
      `SELECT * FROM orders WHERE date >= date('now', '-6 days')`,
      []
    );

    // 填充没有数据的日期
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const trend = dates.map(date => {
      const dayOrders = orders.filter(o => o.date === date);
      const registeredCount = dayOrders.filter(o => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED).length;
      const refundedCount = dayOrders.filter(o => o.status === ORDER_STATUS.REFUNDED).length;
      const income = dayOrders
        .filter(o => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED)
        .reduce((sum, o) => sum + (o.price || 0), 0);
      
      return {
        date,
        registeredCount,
        refundedCount,
        income
      };
    });

    return trend;
  }

  /**
   * 获取科室挂号排行
   */
  async getDepartmentRanking(limit = 10) {
    // 获取所有科室
    const departments = await dbAsync.all(
      `SELECT * FROM departments WHERE status = 1`,
      []
    );
    
    // 获取近30天的订单
    const orders = await dbAsync.all(
      `SELECT * FROM orders WHERE date >= date('now', '-30 days')`,
      []
    );
    
    const validOrders = orders.filter(o => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED);
    
    // 统计每个科室的数据
    const results = departments.map(dept => {
      const deptOrders = validOrders.filter(o => o.department_id === dept.id);
      return {
        id: dept.id,
        name: dept.name,
        order_count: deptOrders.length,
        income: deptOrders.reduce((sum, o) => sum + (o.price || 0), 0)
      };
    });

    return results
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, limit);
  }

  /**
   * 获取医生挂号排行
   */
  async getDoctorRanking(limit = 10) {
    // 获取所有医生
    const doctors = await dbAsync.all(
      `SELECT * FROM doctors WHERE status = 1`,
      []
    );
    
    // 获取科室名称映射
    const departments = await dbAsync.all(`SELECT * FROM departments`, []);
    const deptMap = {};
    departments.forEach(d => deptMap[d.id] = d.name);
    
    // 获取近30天的订单
    const orders = await dbAsync.all(
      `SELECT * FROM orders WHERE date >= date('now', '-30 days')`,
      []
    );
    
    const validOrders = orders.filter(o => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED);
    
    // 统计每个医生的数据
    const results = doctors.map(doctor => {
      const doctorOrders = validOrders.filter(o => o.doctor_id === doctor.id);
      return {
        id: doctor.id,
        name: doctor.name,
        title: doctor.title,
        department_name: deptMap[doctor.department_id] || '',
        order_count: doctorOrders.length,
        income: doctorOrders.reduce((sum, o) => sum + (o.price || 0), 0)
      };
    });

    return results
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, limit);
  }

  /**
   * 获取仪表盘数据
   */
  async getDashboardData() {
    const [today, trend, deptRanking, doctorRanking] = await Promise.all([
      this.getTodayStatistics(),
      this.getWeeklyTrend(),
      this.getDepartmentRanking(5),
      this.getDoctorRanking(10)
    ]);

    return {
      today,
      trend,
      departmentRanking: deptRanking,
      doctorRanking: doctorRanking
    };
  }

  /**
   * 获取统计数据（按日期范围）
   */
  async getStatisticsByDateRange(startDate, endDate) {
    // 获取日期范围内的订单
    const orders = await dbAsync.all(
      `SELECT * FROM orders`,
      []
    );
    
    const filteredOrders = orders.filter(o => o.date >= startDate && o.date <= endDate);
    
    const registeredOrders = filteredOrders.filter(o => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED);
    const registeredCount = registeredOrders.length;
    const registeredAmount = registeredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    
    const refundedOrders = filteredOrders.filter(o => o.status === ORDER_STATUS.REFUNDED);
    const refundedCount = refundedOrders.length;
    const refundedAmount = refundedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    
    const cancelledCount = filteredOrders.filter(o => o.status === ORDER_STATUS.CANCELLED).length;
    const completedOnlyCount = filteredOrders.filter(
      (o) => o.status === ORDER_STATUS.COMPLETED
    ).length;
    const totalNonCancelledCount = filteredOrders.filter(
      (o) => o.status !== ORDER_STATUS.CANCELLED
    ).length;

    // 每日数据
    const dailyMap = {};
    filteredOrders.forEach(o => {
      if (!dailyMap[o.date]) {
        dailyMap[o.date] = { date: o.date, registered_count: 0, refunded_count: 0, income: 0 };
      }
      
      if (o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COMPLETED) {
        dailyMap[o.date].registered_count++;
        dailyMap[o.date].income += o.price || 0;
      } else if (o.status === ORDER_STATUS.REFUNDED) {
        dailyMap[o.date].refunded_count++;
      }
    });

    return {
      startDate,
      endDate,
      /** 与 StatisticsView 统计卡片字段对齐 */
      totalCount: totalNonCancelledCount,
      completedCount: completedOnlyCount,
      refundedCount,
      totalIncome: registeredAmount,
      summary: {
        registeredCount,
        registeredAmount,
        refundedCount,
        refundedAmount,
        cancelledCount,
        netIncome: registeredAmount - refundedAmount
      },
      dailyData: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}

module.exports = new StatisticsService();
