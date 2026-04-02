// 订单状态枚举
const ORDER_STATUS = {
  PENDING: 1,      // 待支付
  PAID: 2,         // 已支付
  CANCELLED: 3,    // 已取消
  REFUNDED: 4,     // 已退号
  COMPLETED: 5     // 已完成
};

// 订单状态名称
const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待支付',
  [ORDER_STATUS.PAID]: '已支付',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDED]: '已退号',
  [ORDER_STATUS.COMPLETED]: '已完成'
};

// 状态流转规则
const STATUS_FLOW = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.REFUNDED, ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: [],
  [ORDER_STATUS.COMPLETED]: []
};

// 状态流转对库存的影响 (+1: 恢复库存, 0: 不变, -1: 扣减库存)
const STATUS_INVENTORY_ACTION = {
  [`${ORDER_STATUS.PENDING}_${ORDER_STATUS.PENDING}`]: 0,      // 创建订单
  [`${ORDER_STATUS.PENDING}_${ORDER_STATUS.PAID}`]: 0,         // 支付
  [`${ORDER_STATUS.PENDING}_${ORDER_STATUS.CANCELLED}`]: 1,    // 取消恢复库存
  [`${ORDER_STATUS.PAID}_${ORDER_STATUS.REFUNDED}`]: 1,        // 退号恢复库存
  [`${ORDER_STATUS.PAID}_${ORDER_STATUS.COMPLETED}`]: 0       // 完成
};

// 排班时间段
const TIME_RANGE = {
  AM: 'AM',
  PM: 'PM',
  NIGHT: 'NIGHT'
};

// 用户状态
const USER_STATUS = {
  DISABLED: 0,
  ENABLED: 1
};

// 科室状态
const DEPT_STATUS = {
  DISABLED: 0,
  ENABLED: 1
};

// 医生状态
const DOCTOR_STATUS = {
  STOPPED: 0,
  ACTIVE: 1
};

// 排班状态
const SCHEDULE_STATUS = {
  STOPPED: 0,
  ACTIVE: 1
};

// 菜单类型
const MENU_TYPE = {
  DIRECTORY: 1,  // 目录
  MENU: 2,       // 菜单
  BUTTON: 3      // 按钮
};

// 响应状态码
const HTTP_CODE = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  SERVER_ERROR: 500
};

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_TEXT,
  STATUS_FLOW,
  STATUS_INVENTORY_ACTION,
  TIME_RANGE,
  USER_STATUS,
  DEPT_STATUS,
  DOCTOR_STATUS,
  SCHEDULE_STATUS,
  MENU_TYPE,
  HTTP_CODE
};
