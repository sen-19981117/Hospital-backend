const { dbAsync } = require('../config/database');

class PatientService {
  /**
   * 获取患者列表
   */
  async getPatientList(params) {
    const { keyword, phone, page = 1, pageSize = 10 } = params;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (keyword) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR id_card LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (phone) {
      whereClause += ' AND phone LIKE ?';
      queryParams.push(`%${phone}%`);
    }

    // 查询总数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM patients ${whereClause}`,
      queryParams
    );
    const total = countResult.total;

    // 查询列表
    const offset = (page - 1) * pageSize;
    const list = await dbAsync.all(
      `SELECT id, name, gender, phone, id_card, address, birth_date, create_time
       FROM patients
       ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(pageSize), parseInt(offset)]
    );

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 根据ID获取患者
   */
  async getPatientById(id) {
    return await dbAsync.get(
      'SELECT * FROM patients WHERE id = ?',
      [id]
    );
  }

  /**
   * 根据身份证号获取患者
   */
  async getPatientByIdCard(idCard) {
    return await dbAsync.get(
      'SELECT * FROM patients WHERE id_card = ?',
      [idCard]
    );
  }

  /**
   * 创建患者
   */
  async createPatient(data) {
    const {
      name,
      gender,
      phone,
      idCard,
      address,
      birthDate
    } = data;

    // 如果提供了身份证号，检查是否已存在
    if (idCard) {
      const existing = await this.getPatientByIdCard(idCard);
      if (existing) {
        throw new Error('该身份证号的患者已存在');
      }
    }

    const result = await dbAsync.run(
      `INSERT INTO patients (name, gender, phone, id_card, address, birth_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, gender, phone, idCard, address, birthDate]
    );

    return this.getPatientById(result.id);
  }

  /**
   * 更新患者
   */
  async updatePatient(id, data) {
    const {
      name,
      gender,
      phone,
      idCard,
      address,
      birthDate
    } = data;

    // 检查患者是否存在
    const patient = await this.getPatientById(id);
    if (!patient) {
      throw new Error('患者不存在');
    }

    // 如果修改身份证号，检查是否重复
    if (idCard && idCard !== patient.id_card) {
      const existing = await this.getPatientByIdCard(idCard);
      if (existing) {
        throw new Error('该身份证号的患者已存在');
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      params.push(gender);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (idCard !== undefined) {
      updates.push('id_card = ?');
      params.push(idCard);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (birthDate !== undefined) {
      updates.push('birth_date = ?');
      params.push(birthDate);
    }

    if (updates.length === 0) {
      throw new Error('没有要更新的字段');
    }

    params.push(id);

    await dbAsync.run(
      `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getPatientById(id);
  }

  /**
   * 删除患者
   */
  async deletePatient(id) {
    // 检查患者是否存在
    const patient = await this.getPatientById(id);
    if (!patient) {
      throw new Error('患者不存在');
    }

    // 检查患者是否有挂号记录
    const orderCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM orders WHERE patient_id = ?',
      [id]
    );

    if (orderCount.count > 0) {
      throw new Error('该患者有挂号记录，不能删除');
    }

    await dbAsync.run('DELETE FROM patients WHERE id = ?', [id]);
    return true;
  }

  /**
   * 获取患者的挂号记录
   */
  async getPatientOrders(patientId, params = {}) {
    const { page = 1, pageSize = 10 } = params;

    // 检查患者是否存在
    const patient = await this.getPatientById(patientId);
    if (!patient) {
      throw new Error('患者不存在');
    }

    // 查询总数
    const countResult = await dbAsync.get(
      'SELECT COUNT(*) as total FROM orders WHERE patient_id = ?',
      [patientId]
    );
    const total = countResult.total;

    // 查询列表
    const offset = (page - 1) * pageSize;
    const list = await dbAsync.all(
      `SELECT o.id, o.order_no, o.date, o.time_range, o.price, o.status,
              o.create_time, o.pay_time,
              d.name as doctor_name, d.title as doctor_title,
              dept.name as department_name
       FROM orders o
       LEFT JOIN doctors d ON o.doctor_id = d.id
       LEFT JOIN departments dept ON o.department_id = dept.id
       WHERE o.patient_id = ?
       ORDER BY o.create_time DESC
       LIMIT ? OFFSET ?`,
      [patientId, parseInt(pageSize), parseInt(offset)]
    );

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }
}

module.exports = new PatientService();
