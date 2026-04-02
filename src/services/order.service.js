const { dbAsync, db } = require('../config/database');
const { ORDER_STATUS, ORDER_STATUS_TEXT, STATUS_FLOW, STATUS_INVENTORY_ACTION } = require('../config/constants');
const scheduleService = require('./schedule.service');

class OrderService {
  /**
   * 生成订单号
   */
  generateOrderNo() {
    const prefix = 'ORD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 获取订单列表
   */
  async getOrderList(params) {
    const {
      keyword,
      patientId,
      doctorId,
      departmentId,
      status,
      date,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = params;

    // 获取所有订单
    let orders = await dbAsync.all(`SELECT * FROM orders`, []);

    // 获取关联数据用于过滤
    const patients = await dbAsync.all(`SELECT id, name, phone FROM patients`, []);
    const patientMap = {};
    patients.forEach(p => patientMap[p.id] = p);

    // 应用过滤条件
    if (keyword) {
      orders = orders.filter(o => {
        const p = patientMap[o.patient_id];
        return (o.order_no && o.order_no.includes(keyword)) || 
               (p && p.name && p.name.includes(keyword)) ||
               (p && p.phone && p.phone.includes(keyword));
      });
    }

    if (patientId) {
      orders = orders.filter(o => o.patient_id === parseInt(patientId));
    }

    if (doctorId) {
      orders = orders.filter(o => o.doctor_id === parseInt(doctorId));
    }

    if (departmentId) {
      orders = orders.filter(o => o.department_id === parseInt(departmentId));
    }

    if (status !== undefined && status !== null && status !== '') {
      orders = orders.filter(o => o.status === parseInt(status));
    }

    if (date) {
      orders = orders.filter(o => o.date === date);
    }

    if (startDate) {
      orders = orders.filter(o => o.date >= startDate);
    }

    if (endDate) {
      orders = orders.filter(o => o.date <= endDate);
    }

    const total = orders.length;

    // 排序和分页
    orders.sort((a, b) => {
      const aTime = a.create_time || '';
      const bTime = b.create_time || '';
      return bTime.localeCompare(aTime);
    });

    const offset = (page - 1) * pageSize;
    const list = orders.slice(offset, offset + parseInt(pageSize));

    // 获取医生、科室数据
    const doctors = await dbAsync.all(`SELECT id, name, title FROM doctors`, []);
    const doctorMap = {};
    doctors.forEach(d => doctorMap[d.id] = d);

    const departments = await dbAsync.all(`SELECT id, name FROM departments`, []);
    const deptMap = {};
    departments.forEach(d => deptMap[d.id] = d);

    // 添加关联数据
    const enrichedList = list.map(order => ({
      ...order,
      statusText: ORDER_STATUS_TEXT[order.status],
      patient_name: patientMap[order.patient_id]?.name || '',
      patient_phone: patientMap[order.patient_id]?.phone || '',
      doctor_name: doctorMap[order.doctor_id]?.name || '',
      doctor_title: doctorMap[order.doctor_id]?.title || '',
      department_name: deptMap[order.department_id]?.name || ''
    }));

    return { list: enrichedList, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 根据ID获取订单
   */
  async getOrderById(id) {
    const orders = await dbAsync.all(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (orders.length === 0) return null;
    
    const order = orders[0];

    // 获取关联数据
    const patients = await dbAsync.all(`SELECT id, name, phone FROM patients WHERE id = ?`, [order.patient_id]);
    const doctors = await dbAsync.all(`SELECT id, name, title FROM doctors WHERE id = ?`, [order.doctor_id]);
    const departments = await dbAsync.all(`SELECT id, name FROM departments WHERE id = ?`, [order.department_id]);

    return {
      ...order,
      statusText: ORDER_STATUS_TEXT[order.status],
      patient_name: patients[0]?.name || '',
      patient_phone: patients[0]?.phone || '',
      doctor_name: doctors[0]?.name || '',
      doctor_title: doctors[0]?.title || '',
      department_name: departments[0]?.name || ''
    };
  }

  /**
   * 检查状态流转是否合法
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const allowedStatuses = STATUS_FLOW[currentStatus];
    return allowedStatuses && allowedStatuses.includes(newStatus);
  }

  /**
   * 创建订单
   */
  async createOrder(data) {
    const { patientId, scheduleId } = data;

    // 检查患者是否存在
    const patients = await dbAsync.all(`SELECT id FROM patients WHERE id = ?`, [patientId]);
    if (patients.length === 0) {
      throw new Error('患者不存在');
    }

    // 检查排班是否存在且有号源
    const schedule = await scheduleService.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('排班不存在');
    }

    if (schedule.status !== 1) {
      throw new Error('该排班已停诊');
    }

    if (schedule.remain_count <= 0) {
      throw new Error('号源已售罄');
    }

    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 创建订单
    const result = await dbAsync.run(
      `INSERT INTO orders (order_no, patient_id, doctor_id, department_id, schedule_id, 
                         date, time_range, price, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNo,
        patientId,
        schedule.doctor_id,
        schedule.department_id,
        scheduleId,
        schedule.date,
        schedule.time_range,
        schedule.price,
        ORDER_STATUS.PENDING
      ]
    );

    // 扣减号源
    await scheduleService.decrementSlot(scheduleId, 1);

    return this.getOrderById(result.id);
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(id, newStatus, operatorId) {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('订单不存在');
    }

    const currentStatus = order.status;

    // 检查状态流转是否合法
    if (!this.isValidStatusTransition(currentStatus, newStatus)) {
      throw new Error(`订单状态不能从${ORDER_STATUS_TEXT[currentStatus]}变更为${ORDER_STATUS_TEXT[newStatus]}`);
    }

    // 计算库存变化
    const inventoryKey = `${currentStatus}_${newStatus}`;
    const inventoryAction = STATUS_INVENTORY_ACTION[inventoryKey] || 0;

    // 构建更新对象
    const updates = { status: newStatus };
    
    // 如果变为已支付，记录支付时间
    if (newStatus === ORDER_STATUS.PAID) {
      updates.pay_time = new Date().toISOString();
    }

    db.update('orders', parseInt(id), updates);

    // 处理库存变化
    if (inventoryAction > 0) {
      await scheduleService.incrementSlot(order.schedule_id, inventoryAction);
    }

    return this.getOrderById(id);
  }

  /**
   * 支付订单
   */
  async payOrder(id) {
    return this.updateOrderStatus(id, ORDER_STATUS.PAID);
  }

  /**
   * 取消订单
   */
  async cancelOrder(id) {
    return this.updateOrderStatus(id, ORDER_STATUS.CANCELLED);
  }

  /**
   * 退号
   */
  async refundOrder(id) {
    return this.updateOrderStatus(id, ORDER_STATUS.REFUNDED);
  }

  /**
   * 完成订单
   */
  async completeOrder(id) {
    return this.updateOrderStatus(id, ORDER_STATUS.COMPLETED);
  }

  /**
   * 获取医生订单列表（医生视角）
   */
  async getDoctorOrders(doctorId, params = {}) {
    const { status, date, page = 1, pageSize = 10 } = params;

    // 获取该医生的订单
    let orders = await dbAsync.all(`SELECT * FROM orders WHERE doctor_id = ?`, [doctorId]);

    // 应用过滤条件
    if (status !== undefined && status !== null && status !== '') {
      orders = orders.filter(o => o.status === parseInt(status));
    }

    if (date) {
      orders = orders.filter(o => o.date === date);
    }

    const total = orders.length;

    // 排序和分页
    orders.sort((a, b) => {
      const aTime = a.create_time || '';
      const bTime = b.create_time || '';
      return bTime.localeCompare(aTime);
    });

    const offset = (page - 1) * pageSize;
    const list = orders.slice(offset, offset + parseInt(pageSize));

    // 获取患者数据
    const patients = await dbAsync.all(`SELECT id, name, gender, phone FROM patients`, []);
    const patientMap = {};
    patients.forEach(p => patientMap[p.id] = p);

    // 添加关联数据
    const enrichedList = list.map(order => ({
      ...order,
      statusText: ORDER_STATUS_TEXT[order.status],
      patient_name: patientMap[order.patient_id]?.name || '',
      patient_gender: patientMap[order.patient_id]?.gender || '',
      patient_phone: patientMap[order.patient_id]?.phone || ''
    }));

    return { list: enrichedList, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }
}

module.exports = new OrderService();
