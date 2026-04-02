const { dbAsync } = require('../config/database');

class DoctorService {
  /**
   * 获取医生列表
   */
  async getDoctorList(params) {
    const { keyword, departmentId, status, page = 1, pageSize = 10 } = params;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (keyword) {
      whereClause += ' AND (d.name LIKE ? OR d.phone LIKE ? OR d.skill LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (departmentId) {
      whereClause += ' AND d.department_id = ?';
      queryParams.push(departmentId);
    }

    if (status !== undefined && status !== null && status !== '') {
      whereClause += ' AND d.status = ?';
      queryParams.push(status);
    }

    // 查询总数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM doctors d ${whereClause}`,
      queryParams
    );
    const total = countResult.total;

    // 查询列表
    const offset = (page - 1) * pageSize;
    const list = await dbAsync.all(
      `SELECT d.id, d.name, d.gender, d.phone, d.department_id, 
              d.title, d.skill, d.avatar, d.status, d.create_time,
              dept.name as department_name
       FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.id
       ${whereClause}
       ORDER BY d.id
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(pageSize), parseInt(offset)]
    );

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 获取所有医生（不分页）
   */
  async getAllDoctors(departmentId = null) {
    let sql = `
      SELECT d.id, d.name, d.title, d.department_id, dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.status = 1
    `;
    const params = [];

    if (departmentId) {
      sql += ' AND d.department_id = ?';
      params.push(departmentId);
    }

    sql += ' ORDER BY d.id';

    return await dbAsync.all(sql, params);
  }

  /**
   * 根据ID获取医生
   */
  async getDoctorById(id) {
    return await dbAsync.get(
      `SELECT d.*, dept.name as department_name
       FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.id
       WHERE d.id = ?`,
      [id]
    );
  }

  /**
   * 创建医生
   */
  async createDoctor(data) {
    const {
      name,
      gender,
      phone,
      departmentId,
      title,
      skill,
      avatar,
      status = 1
    } = data;

    // 检查科室是否存在
    const department = await dbAsync.get(
      'SELECT id FROM departments WHERE id = ? AND status = 1',
      [departmentId]
    );

    if (!department) {
      throw new Error('所选科室不存在或已停用');
    }

    const result = await dbAsync.run(
      `INSERT INTO doctors (name, gender, phone, department_id, title, skill, avatar, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, gender, phone, departmentId, title, skill, avatar, status]
    );

    return this.getDoctorById(result.id);
  }

  /**
   * 更新医生
   */
  async updateDoctor(id, data) {
    const {
      name,
      gender,
      phone,
      departmentId,
      title,
      skill,
      avatar,
      status
    } = data;

    // 检查医生是否存在
    const doctor = await this.getDoctorById(id);
    if (!doctor) {
      throw new Error('医生不存在');
    }

    // 如果修改科室，检查科室是否存在
    if (departmentId) {
      const department = await dbAsync.get(
        'SELECT id FROM departments WHERE id = ? AND status = 1',
        [departmentId]
      );
      if (!department) {
        throw new Error('所选科室不存在或已停用');
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
    if (departmentId !== undefined) {
      updates.push('department_id = ?');
      params.push(departmentId);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (skill !== undefined) {
      updates.push('skill = ?');
      params.push(skill);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      throw new Error('没有要更新的字段');
    }

    params.push(id);

    await dbAsync.run(
      `UPDATE doctors SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getDoctorById(id);
  }

  /**
   * 删除医生
   */
  async deleteDoctor(id) {
    // 检查医生是否存在
    const doctor = await this.getDoctorById(id);
    if (!doctor) {
      throw new Error('医生不存在');
    }

    // 检查医生下是否有排班
    const scheduleCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM schedules WHERE doctor_id = ?',
      [id]
    );

    if (scheduleCount.count > 0) {
      throw new Error('该医生存在排班记录，不能删除');
    }

    await dbAsync.run('DELETE FROM doctors WHERE id = ?', [id]);
    return true;
  }

  /**
   * 修改医生状态
   */
  async updateDoctorStatus(id, status) {
    const doctor = await this.getDoctorById(id);
    if (!doctor) {
      throw new Error('医生不存在');
    }

    await dbAsync.run(
      'UPDATE doctors SET status = ? WHERE id = ?',
      [status, id]
    );

    return true;
  }
}

module.exports = new DoctorService();
