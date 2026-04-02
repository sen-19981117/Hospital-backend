const bcrypt = require('bcryptjs');
const { dbAsync } = require('../config/database');
const { attachRoleFields } = require('../utils/user-role');

class UserService {
  /**
   * 获取用户列表
   */
  async getUserList(params) {
    const { keyword, roleId, status, page = 1, pageSize = 10 } = params;
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (keyword) {
      whereClause += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
      queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (roleId) {
      whereClause += ' AND u.role_id = ?';
      queryParams.push(roleId);
    }

    if (status !== undefined && status !== null && status !== '') {
      whereClause += ' AND u.status = ?';
      queryParams.push(status);
    }

    // 查询总数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      queryParams
    );
    const total = countResult.total;

    // 查询列表
    const offset = (page - 1) * pageSize;
    const list = await dbAsync.all(
      `SELECT u.id, u.username, u.nickname, u.phone, u.avatar, u.status, 
              u.create_time, u.role_id, r.role_name, r.role_key
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(pageSize), parseInt(offset)]
    );

    return { list, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id) {
    const userRow = await dbAsync.get('SELECT * FROM users WHERE id = ?', [id]);
    return attachRoleFields(userRow);
  }

  /**
   * 创建用户
   */
  async createUser(data) {
    const { username, password, nickname, phone, roleId, status = 1 } = data;

    // 检查用户名是否已存在
    const existing = await dbAsync.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existing) {
      throw new Error('用户名已存在');
    }

    // 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await dbAsync.run(
      `INSERT INTO users (username, password, nickname, phone, role_id, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, nickname, phone, roleId, status]
    );

    return this.getUserById(result.id);
  }

  /**
   * 更新用户
   */
  async updateUser(id, data) {
    const { nickname, phone, roleId, status } = data;

    // 检查用户是否存在
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 构建更新字段
    const updates = [];
    const params = [];

    if (nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(nickname);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (roleId !== undefined) {
      updates.push('role_id = ?');
      params.push(roleId);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    updates.push('update_time = CURRENT_TIMESTAMP');

    if (updates.length === 0) {
      throw new Error('没有要更新的字段');
    }

    params.push(id);

    await dbAsync.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getUserById(id);
  }

  /**
   * 删除用户
   */
  async deleteUser(id) {
    // 检查用户是否存在
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 不能删除管理员
    if (user.role_key === 'admin') {
      throw new Error('不能删除管理员账号');
    }

    await dbAsync.run('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }

  /**
   * 修改用户状态
   */
  async updateUserStatus(id, status) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    await dbAsync.run(
      'UPDATE users SET status = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    return true;
  }

  /**
   * 修改用户角色
   */
  async updateUserRole(id, roleId) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 检查角色是否存在
    const role = await dbAsync.get('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      throw new Error('角色不存在');
    }

    await dbAsync.run(
      'UPDATE users SET role_id = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
      [roleId, id]
    );

    return this.getUserById(id);
  }

  /**
   * 重置密码
   */
  async resetPassword(id, newPassword) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    await dbAsync.run(
      'UPDATE users SET password = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    return true;
  }
}

module.exports = new UserService();
