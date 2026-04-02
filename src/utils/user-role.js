const { dbAsync } = require('../config/database');

/**
 * JSON 库的 get/all 不解析 JOIN，需单独查 users 再查 roles。
 */
async function attachRoleFields(userRow) {
  if (!userRow) return null;
  let roleKey = null;
  let roleName = null;
  if (userRow.role_id != null && userRow.role_id !== '') {
    const role = await dbAsync.get('SELECT id, role_key, role_name FROM roles WHERE id = ?', [
      userRow.role_id
    ]);
    if (role) {
      roleKey = role.role_key;
      roleName = role.role_name;
    }
  }
  return { ...userRow, role_key: roleKey, role_name: roleName };
}

function menuIdMatches(menuIds, menuRowId) {
  return menuIds.some((mid) => mid == menuRowId);
}

module.exports = { attachRoleFields, menuIdMatches };
