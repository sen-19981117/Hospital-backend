const express = require('express');
const orderController = require('../controllers/order.controller');
const { orderValidation, paginationValidation } = require('../middleware/request-validator');
const { permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取订单列表（首页「最新预约」仅需少量数据；允许 dashboard:view 只读列表）
router.get(
  '/',
  permissionMiddleware(['order:view', 'dashboard:view']),
  paginationValidation,
  orderController.getOrderList
);

// 获取订单详情
router.get('/:id', permissionMiddleware('order:view'), orderController.getOrderById);

// 创建订单
router.post('/', permissionMiddleware('order:add'), orderValidation.create, orderController.createOrder);

// 支付订单
router.put('/:id/pay', permissionMiddleware('order:pay'), orderValidation.statusUpdate, orderController.payOrder);

// 取消订单
router.put('/:id/cancel', permissionMiddleware('order:cancel'), orderValidation.statusUpdate, orderController.cancelOrder);

// 退号
router.put('/:id/refund', permissionMiddleware('order:refund'), orderValidation.statusUpdate, orderController.refundOrder);

// 完成订单（医生接诊）
router.put('/:id/complete', permissionMiddleware('order:complete'), orderValidation.statusUpdate, orderController.completeOrder);

// 获取医生的订单列表（医生视角）
router.get('/doctor/:doctorId', permissionMiddleware('order:view'), paginationValidation, orderController.getDoctorOrders);

// 获取当前医生的订单列表
router.get('/my/list', permissionMiddleware('order:view'), paginationValidation, orderController.getMyOrders);

module.exports = router;
