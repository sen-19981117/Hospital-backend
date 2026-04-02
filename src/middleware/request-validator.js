const { validationResult, body, param, query } = require('express-validator');
const Response = require('../utils/response');

/**
 * 处理验证结果
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return Response.badRequest(res, errorMessages);
  }
  next();
};

/**
 * 登录验证规则
 */
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度应在3-50个字符之间'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6, max: 50 })
    .withMessage('密码长度应在6-50个字符之间'),
  handleValidationErrors
];

/**
 * 用户验证规则
 */
const userValidation = {
  create: [
    body('username')
      .notEmpty()
      .withMessage('用户名不能为空')
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度应在3-50个字符之间'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
      .isLength({ min: 6, max: 50 })
      .withMessage('密码长度应在6-50个字符之间'),
    body('roleId')
      .notEmpty()
      .withMessage('角色不能为空')
      .isInt()
      .withMessage('角色ID必须是整数'),
    body('phone')
      .optional()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('用户ID必须是整数'),
    body('nickname')
      .optional()
      .isLength({ max: 50 })
      .withMessage('昵称长度不能超过50个字符'),
    body('phone')
      .optional()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),
    body('roleId')
      .optional()
      .isInt()
      .withMessage('角色ID必须是整数'),
    handleValidationErrors
  ]
};

/**
 * 科室验证规则
 */
const departmentValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('科室名称不能为空')
      .isLength({ max: 50 })
      .withMessage('科室名称长度不能超过50个字符'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('科室描述长度不能超过500个字符'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('科室ID必须是整数'),
    body('name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('科室名称长度不能超过50个字符'),
    handleValidationErrors
  ]
};

/**
 * 医生验证规则
 */
const doctorValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('医生姓名不能为空'),
    body('departmentId')
      .notEmpty()
      .withMessage('所属科室不能为空')
      .isInt()
      .withMessage('科室ID必须是整数'),
    body('gender')
      .optional()
      .isIn(['男', '女'])
      .withMessage('性别只能是男或女'),
    body('phone')
      .optional()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('医生ID必须是整数'),
    handleValidationErrors
  ]
};

/**
 * 排班验证规则
 */
const scheduleValidation = {
  create: [
    body('doctorId')
      .notEmpty()
      .withMessage('医生不能为空')
      .isInt()
      .withMessage('医生ID必须是整数'),
    body('date')
      .notEmpty()
      .withMessage('日期不能为空')
      .isDate()
      .withMessage('日期格式不正确'),
    body('timeRange')
      .notEmpty()
      .withMessage('时间段不能为空')
      .isIn(['AM', 'PM', 'NIGHT'])
      .withMessage('时间段只能是AM、PM或NIGHT'),
    body('totalCount')
      .notEmpty()
      .withMessage('号源数量不能为空')
      .isInt({ min: 1 })
      .withMessage('号源数量必须是大于0的整数'),
    body('price')
      .notEmpty()
      .withMessage('挂号费不能为空')
      .isFloat({ min: 0 })
      .withMessage('挂号费必须是非负数'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('排班ID必须是整数'),
    handleValidationErrors
  ]
};

/**
 * 患者验证规则
 */
const patientValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('患者姓名不能为空'),
    body('phone')
      .notEmpty()
      .withMessage('手机号不能为空')
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),
    body('idCard')
      .optional()
      .matches(/^\d{17}[\dXx]$/)
      .withMessage('身份证号格式不正确'),
    body('gender')
      .optional()
      .isIn(['男', '女'])
      .withMessage('性别只能是男或女'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('患者ID必须是整数'),
    handleValidationErrors
  ]
};

/**
 * 订单验证规则
 */
const orderValidation = {
  create: [
    body('patientId')
      .notEmpty()
      .withMessage('患者不能为空')
      .isInt()
      .withMessage('患者ID必须是整数'),
    body('scheduleId')
      .notEmpty()
      .withMessage('排班不能为空')
      .isInt()
      .withMessage('排班ID必须是整数'),
    handleValidationErrors
  ],
  statusUpdate: [
    param('id')
      .isInt()
      .withMessage('订单ID必须是整数'),
    handleValidationErrors
  ]
};

/**
 * 分页查询验证
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100之间的整数'),
  handleValidationErrors
];

module.exports = {
  loginValidation,
  userValidation,
  departmentValidation,
  doctorValidation,
  scheduleValidation,
  patientValidation,
  orderValidation,
  paginationValidation,
  handleValidationErrors
};
