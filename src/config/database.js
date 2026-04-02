const fs = require('fs');
const path = require('path');

// 数据库目录
const dbDir = path.resolve(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据文件路径
const dataFile = path.join(dbDir, 'data.json');

// 默认数据结构
const defaultData = {
  users: [],
  roles: [],
  menus: [],
  role_menus: [],
  departments: [],
  doctors: [],
  schedules: [],
  patients: [],
  orders: []
};

// 内存中的数据
let memoryData = null;

// 加载数据
function loadData() {
  if (memoryData) return memoryData;
  
  try {
    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf8');
      memoryData = JSON.parse(content);
    } else {
      memoryData = { ...defaultData };
      saveData();
    }
  } catch (err) {
    console.error('加载数据失败:', err);
    memoryData = { ...defaultData };
  }
  
  return memoryData;
}

// 保存数据
function saveData() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(memoryData, null, 2), 'utf8');
  } catch (err) {
    console.error('保存数据失败:', err);
  }
}

// 获取下一个ID
function getNextId(table) {
  const data = loadData();
  const items = data[table] || [];
  if (items.length === 0) return 1;
  return Math.max(...items.map(item => item.id)) + 1;
}

/** Express 路由 params 常为字符串，JSON 里 id 多为数字，严格 === 会匹配失败 */
function sqlEquals(a, b) {
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (
    a !== '' &&
    b !== '' &&
    String(a).trim() !== '' &&
    String(b).trim() !== '' &&
    !Number.isNaN(na) &&
    !Number.isNaN(nb)
  ) {
    return na === nb;
  }
  return String(a) === String(b);
}

/**
 * 处理 WHERE 中的 LIKE：SQL 里 (a LIKE ? OR b LIKE ? OR c LIKE ?) 为 OR，
 * 若对每个 LIKE 连续 filter 会变成 AND，用户列表等关键词查询会几乎无结果。
 */
function applyLikeFilters(items, whereClause, params, startIdx) {
  const likeRegex = /((?:\w+\.)?\w+)\s+LIKE\s+\?/gi;
  const likeMatches = [...whereClause.matchAll(likeRegex)];
  let paramIdx = startIdx;
  if (likeMatches.length === 0) {
    return { items, paramIdx };
  }

  const cols = likeMatches.map((m) => {
    const full = m[1];
    return full.includes('.') ? full.split('.').pop() : full;
  });
  const keywords = likeMatches.map((_, i) => {
    const raw = String(params[paramIdx + i] ?? '').replace(/%/g, '');
    return raw.toLowerCase();
  });
  const sameKeyword =
    keywords.length > 0 && keywords.every((k) => k === keywords[0]);
  const hasKeyword = keywords[0] !== '';

  if (likeMatches.length > 1 && sameKeyword && hasKeyword) {
    const kw = keywords[0];
    items = items.filter((item) =>
      cols.some((col) =>
        String(item[col] ?? '')
          .toLowerCase()
          .includes(kw)
      )
    );
    paramIdx += likeMatches.length;
    return { items, paramIdx };
  }

  for (let i = 0; i < likeMatches.length; i++) {
    const col = cols[i];
    const pattern = params[paramIdx] || '';
    const keyword = pattern.replace(/%/g, '');
    items = items.filter((item) => {
      const value = String(item[col] ?? '').toLowerCase();
      return !keyword || value.includes(keyword.toLowerCase());
    });
    paramIdx++;
  }
  return { items, paramIdx };
}

// 模拟SQL查询的异步API
const dbAsync = {
  // 执行插入操作 - 支持 INSERT INTO table (...) VALUES (...)
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        const data = loadData();

        // UPDATE table SET col = ?, ... WHERE col = ?
        const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?/is);
        if (updateMatch) {
          const table = updateMatch[1];
          const setClause = updateMatch[2];
          const whereCol = updateMatch[3];
          const items = data[table] || [];
          const assignments = setClause.split(',').map((s) => s.trim());
          let pi = 0;
          const patch = {};
          for (const a of assignments) {
            const q = a.match(/^(\w+)\s*=\s*\?$/);
            if (q) {
              patch[q[1]] = params[pi++];
              continue;
            }
            const ts = a.match(/^(\w+)\s*=\s*CURRENT_TIMESTAMP$/i);
            if (ts) {
              patch[ts[1]] = new Date().toISOString();
            }
          }
          const whereVal = params[pi];
          if (whereVal === undefined) {
            return reject(new Error('UPDATE 参数与占位符数量不匹配'));
          }
          const idx = items.findIndex((item) => sqlEquals(item[whereCol], whereVal));
          if (idx < 0) {
            return reject(new Error('记录不存在'));
          }
          Object.assign(items[idx], patch);
          saveData();
          return resolve({ changes: 1 });
        }

        // DELETE FROM table WHERE col = ?
        const deleteMatch = sql.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?$/i);
        if (deleteMatch) {
          const table = deleteMatch[1];
          const col = deleteMatch[2];
          const val = params[0];
          const items = data[table] || [];
          const before = items.length;
          data[table] = items.filter((item) => !sqlEquals(item[col], val));
          saveData();
          return resolve({ changes: before - data[table].length });
        }

        // 解析 INSERT INTO table (...) VALUES (...)
        const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        
        if (insertMatch) {
          const table = insertMatch[1];
          const columns = insertMatch[2].split(',').map(c => c.trim());
          const placeholders = insertMatch[3].split(',').map(p => p.trim());
          
          const id = getNextId(table);
          const newItem = { id };
          
          columns.forEach((col, index) => {
            if (col !== 'id') {
              const placeholder = placeholders[index];
              if (placeholder === '?') {
                newItem[col] = params[index] !== undefined ? params[index] : null;
              } else {
                // 去除引号
                newItem[col] = placeholder.replace(/^'|'$/g, '');
              }
            }
          });
          
          // 添加时间戳
          if (columns.includes('create_time') || sql.includes('create_time')) {
            newItem.create_time = new Date().toISOString();
          }
          if (columns.includes('update_time') || sql.includes('update_time')) {
            newItem.update_time = new Date().toISOString();
          }
          
          if (!data[table]) {
            data[table] = [];
          }
          data[table].push(newItem);
          saveData();
          
          resolve({ id, changes: 1 });
        } else {
          reject(new Error('不支持的SQL语句: ' + sql.substring(0, 50)));
        }
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // 查询单条记录
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        const data = loadData();
        
        // 处理 COUNT(*) 聚合查询
        const countMatch = sql.match(/SELECT\s+COUNT\(\*\)\s+as\s+(\w+)/i);
        if (countMatch) {
          const alias = countMatch[1];
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          if (tableMatch) {
            const table = tableMatch[1];
            let items = data[table] || [];
            
            // 解析WHERE条件
            const whereMatch = sql.match(/WHERE\s+(.+)/i);
            if (whereMatch) {
              const whereClause = whereMatch[1].trim();
              let paramIdx = 0;
              ({ items, paramIdx } = applyLikeFilters(items, whereClause, params, paramIdx));

              const eqMatches = [...whereClause.matchAll(/((?:\w+\.)?\w+)\s*=\s*\?/g)];
              for (const match of eqMatches) {
                const full = match[1];
                const col = full.includes('.') ? full.split('.').pop() : full;
                if (params[paramIdx] !== undefined) {
                  items = items.filter((item) =>
                    sqlEquals(item[col], params[paramIdx])
                  );
                }
                paramIdx++;
              }
            }
            
            const result = {};
            result[alias] = items.length;
            return resolve(result);
          }
        }
        
        // 解析表名
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (!tableMatch) {
          return resolve(null);
        }
        
        const table = tableMatch[1];
        let items = data[table] || [];
        
        // 解析WHERE条件
        const whereMatch = sql.match(/WHERE\s+(.+)/i);
        if (whereMatch) {
          const whereClause = whereMatch[1];
          
          // 简单条件解析
          const conditions = whereClause.split(/\s+AND\s+/i);
          
          items = items.filter(item => {
            return conditions.every((condition, idx) => {
              const match = condition.match(/(\w+)\s*=\s*\?/);
              if (match) {
                const col = match[1];
                return sqlEquals(item[col], params[idx]);
              }
              return true;
            });
          });
        }
        
        resolve(items[0] || null);
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // 查询多条记录
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        const data = loadData();
        
        // 解析表名
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (!tableMatch) {
          return resolve([]);
        }
        
        const table = tableMatch[1];
        let items = data[table] || [];
        
        // 解析JOIN - 简化为先加载关联数据然后合并
        const joinMatch = sql.match(/JOIN\s+(\w+)\s+\w*\s*ON\s+([^\s]+)\s*=\s*([^\s]+)/i);
        if (joinMatch) {
          const joinTable = joinMatch[1];
          const leftField = joinMatch[2];
          const rightField = joinMatch[3];
          const joinItems = data[joinTable] || [];
          
          // 提取字段名 (去掉表名前缀)
          const leftCol = leftField.includes('.') ? leftField.split('.')[1] : leftField;
          const rightCol = rightField.includes('.') ? rightField.split('.')[1] : rightField;
          
          items = items.map(item => {
            const joinItem = joinItems.find(j => sqlEquals(j[rightCol], item[leftCol]));
            if (joinItem) {
              // 合并数据，添加前缀避免冲突
              const prefixed = {};
              Object.keys(joinItem).forEach(key => {
                prefixed[joinTable.substring(0, joinTable.length - 1) + '_' + key] = joinItem[key];
              });
              return { ...item, ...prefixed };
            }
            return item;
          });
        }
        
        // 解析WHERE条件
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i);
        if (whereMatch) {
          let whereClause = whereMatch[1].trim();
          
          let paramIdx = 0;
          ({ items, paramIdx } = applyLikeFilters(items, whereClause, params, paramIdx));

          const eqMatches = [...whereClause.matchAll(/((?:\w+\.)?\w+)\s*=\s*\?/g)];
          for (const match of eqMatches) {
            const full = match[1];
            const col = full.includes('.') ? full.split('.').pop() : full;
            if (params[paramIdx] !== undefined) {
              items = items.filter((item) =>
                sqlEquals(item[col], params[paramIdx])
              );
            }
            paramIdx++;
          }
          
          // 解析 IN 条件
          const inMatch = whereClause.match(/(\w+)\s+IN\s*\(([^)]+)\)/);
          if (inMatch) {
            const col = inMatch[1];
            const values = inMatch[2].split(',').map(v => {
              const trimmed = v.trim();
              return isNaN(trimmed) ? trimmed.replace(/'/g, '') : parseInt(trimmed);
            });
            items = items.filter(item => values.includes(item[col]));
          }
          
          // 解析 >= <= 条件
          const gteMatch = whereClause.match(/(\w+)\s*>=\s*\?/);
          const lteMatch = whereClause.match(/(\w+)\s*<=\s*\?/);
          if (gteMatch && params[paramIdx]) {
            const col = gteMatch[1];
            items = items.filter(item => item[col] >= params[paramIdx]);
            paramIdx++;
          }
          if (lteMatch && params[paramIdx]) {
            const col = lteMatch[1];
            items = items.filter(item => item[col] <= params[paramIdx]);
          }
        }
        
        // 排序
        const orderMatch = sql.match(/ORDER\s+BY\s+(.+)/i);
        if (orderMatch) {
          let orderClause = orderMatch[1].replace(/LIMIT.*$/i, '').replace(/OFFSET.*$/i, '').trim();
          const isDesc = orderClause.toUpperCase().includes('DESC');
          const colRaw = orderClause.replace(/\s+(ASC|DESC)/i, '').trim();
          const col = colRaw.includes('.') ? colRaw.split('.').pop() : colRaw;

          items.sort((a, b) => {
            const aVal = a[col];
            const bVal = b[col];
            
            if (aVal === undefined || bVal === undefined) return 0;
            
            if (isDesc) {
              return aVal > bVal ? -1 : 1;
            } else {
              return aVal > bVal ? 1 : -1;
            }
          });
        }
        
        // LIMIT 和 OFFSET - 支持参数化查询 (LIMIT ? OFFSET ?)
        const limitOffsetMatch = sql.match(/LIMIT\s+\?\s+OFFSET\s+\?/i);
        if (limitOffsetMatch) {
          // 从params数组末尾获取limit和offset
          const limit = params[params.length - 2];
          const offset = params[params.length - 1];
          if (limit !== undefined && offset !== undefined) {
            items = items.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
          }
        } else {
          // 也支持 SQL中的硬编码数字
          const limitMatch = sql.match(/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/i);
          if (limitMatch) {
            const limit = parseInt(limitMatch[1]);
            const offset = parseInt(limitMatch[2]);
            items = items.slice(offset, offset + limit);
          } else {
            const simpleLimitMatch = sql.match(/LIMIT\s+(\d+)/i);
            if (simpleLimitMatch) {
              const limit = parseInt(simpleLimitMatch[1]);
              items = items.slice(0, limit);
            }
          }
        }
        
        resolve(items);
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // 执行多条SQL（主要用于建表）
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      try {
        // 解析 CREATE TABLE IF NOT EXISTS
        const createMatch = sql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i);
        if (createMatch) {
          const table = createMatch[1];
          const data = loadData();
          if (!data[table]) {
            data[table] = [];
            saveData();
          }
        }
        
        // 解析 INSERT OR IGNORE INTO
        const insertIgnoreMatch = sql.match(/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (insertIgnoreMatch) {
          const table = insertIgnoreMatch[1];
          const columns = insertIgnoreMatch[2].split(',').map(c => c.trim());
          const placeholders = insertIgnoreMatch[3].split(',').map(p => p.trim());
          
          const data = loadData();
          
          // 检查是否已存在
          const exists = data[table]?.some(item => {
            return columns.every((col, idx) => {
              const val = placeholders[idx];
              if (val === '?') return true; // 无法检查参数化值
              const cleanVal = val.replace(/^'|'$/g, '');
              return item[col] === cleanVal;
            });
          });
          
          if (!exists) {
            const id = getNextId(table);
            const newItem = { id };
            columns.forEach((col, index) => {
              if (col !== 'id') {
                const val = placeholders[index];
                if (val === '?') {
                  newItem[col] = null;
                } else {
                  newItem[col] = val.replace(/^'|'$/g, '');
                }
              }
            });
            
            if (!data[table]) {
              data[table] = [];
            }
            data[table].push(newItem);
            saveData();
          }
        }
        
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
};

// 额外的直接操作
const db = {
  // 获取整个表
  getTable: (table) => {
    const data = loadData();
    return data[table] || [];
  },
  
  // 更新记录
  update: (table, id, updates) => {
    const data = loadData();
    const items = data[table] || [];
    const index = items.findIndex(item => sqlEquals(item.id, id));
    
    if (index >= 0) {
      items[index] = { ...items[index], ...updates, update_time: new Date().toISOString() };
      saveData();
      return items[index];
    }
    return null;
  },
  
  // 删除记录
  delete: (table, id) => {
    const data = loadData();
    const items = data[table] || [];
    const index = items.findIndex(item => sqlEquals(item.id, id));
    
    if (index >= 0) {
      items.splice(index, 1);
      saveData();
      return true;
    }
    return false;
  },
  
  // 清空表
  clear: (table) => {
    const data = loadData();
    data[table] = [];
    saveData();
  },
  
  // 重置数据库
  reset: () => {
    memoryData = { ...defaultData };
    saveData();
  }
};

module.exports = { db, dbAsync, loadData, saveData };
