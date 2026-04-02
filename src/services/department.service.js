const { dbAsync } = require('../config/database');

class DepartmentService {
  /**
   * 获取科室列表
   */
  async getDepartmentList(params) {
    const { keyword, status, page = 1, pageSize = 10 } = params;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (keyword) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status !== undefined && status !== null && status !== '') {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    // 查询总数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM departments ${whereClause}`,
      queryParams
    );
    const total = countResult.total;

    // 查询列表
    const offset = (page - 1) * pageSize;
    const list = await dbAsync.all(
      `SELECT id, name, description, floor, status, create_time
       FROM departments
       ${whereClause}
       ORDER BY id
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(pageSize), parseInt(offset)]
    );

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 获取所有科室（不分页）
   */
  async getAllDepartments() {
    return await dbAsync.all(
      'SELECT id, name FROM departments WHERE status = 1 ORDER BY id'
    );
  }

  /**
   * 根据ID获取科室
   */
  async getDepartmentById(id) {
    return await dbAsync.get(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
  }

  /**
   * 创建科室
   */
  async createDepartment(data) {
    const { name, description, floor, status = 1 } = data;

    // 检查科室名称是否已存在
    const existing = await dbAsync.get(
      'SELECT id FROM departments WHERE name = ?',
      [name]
    );

    if (existing) {
      throw new Error('科室名称已存在');
    }

    const result = await dbAsync.run(
      `INSERT INTO departments (name, description, floor, status) 
       VALUES (?, ?, ?, ?)`,
      [name, description, floor, status]
    );

    return this.getDepartmentById(result.id);
  }

  /**
   * 更新科室
   */
  async updateDepartment(id, data) {
    const { name, description, floor, status } = data;

    // 检查科室是否存在
    const department = await this.getDepartmentById(id);
    if (!department) {
      throw new Error('科室不存在');
    }

    // 如果修改名称，检查是否重复
    if (name && name !== department.name) {
      const existing = await dbAsync.get(
        'SELECT id FROM departments WHERE name = ? AND id != ?',
        [name, id]
      );
      if (existing) {
        throw new Error('科室名称已存在');
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (floor !== undefined) {
      updates.push('floor = ?');
      params.push(floor);
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
      `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getDepartmentById(id);
  }

  /**
   * 删除科室
   */
  async deleteDepartment(id) {
    // 检查科室是否存在
    const department = await this.getDepartmentById(id);
    if (!department) {
      throw new Error('科室不存在');
    }

    // 检查科室下是否有医生
    const doctorCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM doctors WHERE department_id = ?',
      [id]
    );

    if (doctorCount.count > 0) {
      throw new Error('该科室下存在医生，不能删除');
    }

    // 检查科室下是否有排班
    const scheduleCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM schedules WHERE department_id = ?',
      [id]
    );

    if (scheduleCount.count > 0) {
      throw new Error('该科室下存在排班，不能删除');
    }

    await dbAsync.run('DELETE FROM departments WHERE id = ?', [id]);
    return true;
  }

  /**
   * 修改科室状态
   */
  async updateDepartmentStatus(id, status) {
    const department = await this.getDepartmentById(id);
    if (!department) {
      throw new Error('科室不存在');
    }

    await dbAsync.run(
      'UPDATE departments SET status = ? WHERE id = ?',
      [status, id]
    );

    return true;
  }
}

module.exports = new DepartmentService();
