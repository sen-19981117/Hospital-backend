const { dbAsync } = require('../config/database');
const { TIME_RANGE, SCHEDULE_STATUS } = require('../config/constants');

class ScheduleService {
  /**
   * 获取排班列表
   */
  async getScheduleList(params) {
    const {
      doctorId,
      departmentId,
      date,
      timeRange,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = params;

    // 获取所有排班
    let schedules = await dbAsync.all(`SELECT * FROM schedules`, []);

    // 应用过滤条件
    if (doctorId) {
      schedules = schedules.filter(s => s.doctor_id === parseInt(doctorId));
    }
    if (departmentId) {
      schedules = schedules.filter(s => s.department_id === parseInt(departmentId));
    }
    if (date) {
      schedules = schedules.filter(s => s.date === date);
    }
    if (startDate) {
      schedules = schedules.filter(s => s.date >= startDate);
    }
    if (endDate) {
      schedules = schedules.filter(s => s.date <= endDate);
    }
    if (timeRange) {
      schedules = schedules.filter(s => s.time_range === timeRange);
    }
    if (status !== undefined && status !== null && status !== '') {
      schedules = schedules.filter(s => s.status === parseInt(status));
    }

    const total = schedules.length;

    // 排序和分页
    schedules.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_range.localeCompare(b.time_range);
    });

    const offset = (page - 1) * pageSize;
    const list = schedules.slice(offset, offset + parseInt(pageSize));

    // 获取关联数据
    const doctors = await dbAsync.all(`SELECT id, name, title FROM doctors`, []);
    const departments = await dbAsync.all(`SELECT id, name FROM departments`, []);
    
    const doctorMap = {};
    doctors.forEach(d => doctorMap[d.id] = d);
    
    const deptMap = {};
    departments.forEach(d => deptMap[d.id] = d);

    // 合并数据
    const enrichedList = list.map(s => ({
      ...s,
      doctor_name: doctorMap[s.doctor_id]?.name || '',
      doctor_title: doctorMap[s.doctor_id]?.title || '',
      department_name: deptMap[s.department_id]?.name || ''
    }));

    return { list: enrichedList, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 获取号源列表（用于挂号时选择）
   */
  async getSlotList(params) {
    const { departmentId, date, timeRange } = params;

    // 获取所有排班
    let schedules = await dbAsync.all(`SELECT * FROM schedules`, []);

    // 过滤正常状态且有号源的排班
    schedules = schedules.filter(s => s.status === 1 && s.remain_count > 0);

    // 只查询未来日期的排班
    const today = new Date().toISOString().split('T')[0];
    schedules = schedules.filter(s => s.date >= today);

    if (departmentId) {
      schedules = schedules.filter(s => s.department_id === parseInt(departmentId));
    }
    if (date) {
      schedules = schedules.filter(s => s.date === date);
    }
    if (timeRange) {
      schedules = schedules.filter(s => s.time_range === timeRange);
    }

    // 排序
    schedules.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time_range !== b.time_range) return a.time_range.localeCompare(b.time_range);
      return a.id - b.id;
    });

    // 获取关联数据
    const doctors = await dbAsync.all(`SELECT id, name, title FROM doctors`, []);
    const departments = await dbAsync.all(`SELECT id, name FROM departments`, []);
    
    const doctorMap = {};
    doctors.forEach(d => doctorMap[d.id] = d);
    
    const deptMap = {};
    departments.forEach(d => deptMap[d.id] = d);

    // 合并数据
    return schedules.map(s => ({
      ...s,
      doctor_name: doctorMap[s.doctor_id]?.name || '',
      doctor_title: doctorMap[s.doctor_id]?.title || '',
      department_name: deptMap[s.department_id]?.name || ''
    }));
  }

  /**
   * 根据ID获取排班
   */
  async getScheduleById(id) {
    const schedules = await dbAsync.all(`SELECT * FROM schedules WHERE id = ?`, [id]);
    if (schedules.length === 0) return null;
    
    const schedule = schedules[0];
    
    // 获取关联数据
    const doctors = await dbAsync.all(`SELECT * FROM doctors WHERE id = ?`, [schedule.doctor_id]);
    const departments = await dbAsync.all(`SELECT * FROM departments WHERE id = ?`, [schedule.department_id]);
    
    return {
      ...schedule,
      doctor_name: doctors[0]?.name || '',
      doctor_title: doctors[0]?.title || '',
      department_name: departments[0]?.name || ''
    };
  }

  /**
   * 检查排班冲突
   */
  async checkConflict(doctorId, date, timeRange, excludeId = null) {
    let schedules = await dbAsync.all(`SELECT * FROM schedules`, []);
    
    schedules = schedules.filter(
      (s) =>
        Number(s.doctor_id) === Number(doctorId) &&
        s.date === date &&
        s.time_range === timeRange
    );

    if (excludeId != null && excludeId !== '') {
      schedules = schedules.filter((s) => Number(s.id) !== Number(excludeId));
    }
    
    return schedules.length > 0;
  }

  /**
   * 创建排班
   */
  async createSchedule(data) {
    const {
      doctorId,
      departmentId,
      date,
      timeRange,
      totalCount,
      price,
      status = 1
    } = data;

    // 检查医生是否存在
    const doctors = await dbAsync.all(`SELECT * FROM doctors WHERE id = ?`, [doctorId]);
    if (doctors.length === 0) {
      throw new Error('医生不存在');
    }
    const doctor = doctors[0];

    if (doctor.status !== 1) {
      throw new Error('该医生已停诊');
    }

    // 检查排班冲突
    const hasConflict = await this.checkConflict(doctorId, date, timeRange);
    if (hasConflict) {
      throw new Error('该医生在该时间段已有排班');
    }

    // 使用医生的科室（如果未指定）
    const finalDepartmentId = departmentId || doctor.department_id;

    const result = await dbAsync.run(
      `INSERT INTO schedules (doctor_id, department_id, date, time_range, total_count, remain_count, price, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [doctorId, finalDepartmentId, date, timeRange, totalCount, totalCount, price, status]
    );

    return this.getScheduleById(result.id);
  }

  /**
   * 更新排班（含医生、科室、日期、时段；原实现未写库导致改时段后刷新仍显示旧值）
   */
  async updateSchedule(id, data) {
    const {
      doctorId,
      departmentId,
      date,
      timeRange,
      totalCount,
      price,
      status
    } = data;

    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('排班不存在');
    }

    const schedId = parseInt(id, 10);

    const effDoctor =
      doctorId !== undefined && doctorId !== null && doctorId !== ''
        ? parseInt(doctorId, 10)
        : Number(schedule.doctor_id);
    const effDate =
      date !== undefined && date !== null && date !== '' ? date : schedule.date;
    const effTime =
      timeRange !== undefined && timeRange !== null && timeRange !== ''
        ? timeRange
        : schedule.time_range;

    const coreChanged =
      effDoctor !== Number(schedule.doctor_id) ||
      effDate !== schedule.date ||
      effTime !== schedule.time_range;

    if (coreChanged) {
      const hasConflict = await this.checkConflict(effDoctor, effDate, effTime, schedId);
      if (hasConflict) {
        throw new Error('该医生在该时间段已有排班');
      }
    }

    if (doctorId !== undefined && doctorId !== null && doctorId !== '') {
      const doctors = await dbAsync.all(`SELECT * FROM doctors WHERE id = ?`, [
        parseInt(doctorId, 10)
      ]);
      if (doctors.length === 0) {
        throw new Error('医生不存在');
      }
      if (doctors[0].status !== 1) {
        throw new Error('该医生已停诊');
      }
    }

    const updates = {};

    if (doctorId !== undefined && doctorId !== null && doctorId !== '') {
      updates.doctor_id = parseInt(doctorId, 10);
    }
    if (date !== undefined && date !== null && date !== '') {
      updates.date = date;
    }
    if (timeRange !== undefined && timeRange !== null && timeRange !== '') {
      updates.time_range = timeRange;
    }

    if (departmentId !== undefined && departmentId !== null && departmentId !== '') {
      updates.department_id = parseInt(departmentId, 10);
    } else if (doctorId !== undefined && doctorId !== null && doctorId !== '') {
      const doctors = await dbAsync.all(`SELECT * FROM doctors WHERE id = ?`, [
        parseInt(doctorId, 10)
      ]);
      if (doctors[0]) {
        updates.department_id = doctors[0].department_id;
      }
    }

    if (totalCount !== undefined && totalCount !== null) {
      const diff = totalCount - schedule.total_count;
      const newRemainCount = Math.max(0, schedule.remain_count + diff);
      updates.total_count = totalCount;
      updates.remain_count = newRemainCount;
    }

    if (price !== undefined && price !== null) {
      updates.price = price;
    }

    if (status !== undefined && status !== null) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('没有要更新的字段');
    }

    const db = require('../config/database').db;
    db.update('schedules', schedId, updates);

    return this.getScheduleById(id);
  }

  /**
   * 删除排班
   */
  async deleteSchedule(id) {
    // 检查排班是否存在
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('排班不存在');
    }

    // 检查是否有未完成的订单
    const orders = await dbAsync.all(`SELECT * FROM orders WHERE schedule_id = ?`, [id]);
    const unfinishedOrders = orders.filter(o => o.status === 1 || o.status === 2);

    if (unfinishedOrders.length > 0) {
      throw new Error('该排班存在未完成的订单，不能删除');
    }

    const db = require('../config/database').db;
    db.delete('schedules', parseInt(id));
    return true;
  }

  /**
   * 修改排班状态（停诊/恢复）
   */
  async updateScheduleStatus(id, status) {
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('排班不存在');
    }

    const db = require('../config/database').db;
    db.update('schedules', parseInt(id), { status });

    return true;
  }

  /**
   * 扣减号源
   */
  async decrementSlot(id, count = 1) {
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('排班不存在');
    }

    if (schedule.remain_count < count) {
      throw new Error('号源不足');
    }

    const db = require('../config/database').db;
    db.update('schedules', parseInt(id), { 
      remain_count: schedule.remain_count - count 
    });

    return true;
  }

  /**
   * 恢复号源
   */
  async incrementSlot(id, count = 1) {
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('排班不存在');
    }

    // 号源不能超过总数
    const newRemainCount = Math.min(schedule.total_count, schedule.remain_count + count);

    const db = require('../config/database').db;
    db.update('schedules', parseInt(id), { remain_count: newRemainCount });

    return true;
  }
}

module.exports = new ScheduleService();
