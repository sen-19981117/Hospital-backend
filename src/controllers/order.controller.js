const orderService = require('../services/order.service');
const Response = require('../utils/response');

class OrderController {
  /**
   * 获取订单列表
   */
  async getOrderList(req, res, next) {
    try {
      const result = await orderService.getOrderList(req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取订单详情
   */
  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);
      if (!order) {
        return Response.notFound(res, '订单不存在');
      }
      return Response.success(res, order);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 创建订单
   */
  async createOrder(req, res, next) {
    try {
      const order = await orderService.createOrder(req.body);
      return Response.success(res, order, '创建成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 支付订单
   */
  async payOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.payOrder(id);
      return Response.success(res, order, '支付成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.cancelOrder(id);
      return Response.success(res, order, '取消成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 退号
   */
  async refundOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.refundOrder(id);
      return Response.success(res, order, '退号成功');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 完成订单
   */
  async completeOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.completeOrder(id);
      return Response.success(res, order, '标记完成');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取医生订单列表
   */
  async getDoctorOrders(req, res, next) {
    try {
      const { doctorId } = req.params;
      const result = await orderService.getDoctorOrders(doctorId, req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取当前医生的订单列表
   */
  async getMyOrders(req, res, next) {
    try {
      // 获取当前登录用户的医生ID（需要在用户表中关联医生）
      // 这里简化处理，假设用户ID就是医生ID，实际应该查询关联表
      const doctorId = req.user.doctorId || req.user.id;
      const result = await orderService.getDoctorOrders(doctorId, req.query);
      return Response.page(res, result.list, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
