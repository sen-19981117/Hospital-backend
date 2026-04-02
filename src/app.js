require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入路由
const routes = require('./routes');

// 导入中间件
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const logger = require('./utils/logger');

// 创建应用
const app = express();
const PORT = process.env.PORT || 3000;

// 创建日志目录
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 跨域：默认允许任意来源（origin: true 会回显请求 Origin，可与 credentials 同时使用）
// 若需限制，设置环境变量 ALLOWED_ORIGINS=https://a.com,https://b.com（逗号分隔）
const corsOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin:
      corsOrigins.length > 0
        ? (origin, cb) => {
            if (!origin) return cb(null, true);
            cb(null, corsOrigins.includes(origin));
          }
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API 路由
app.use('/api', routes);

// 静态文件服务（用于上传的文件）
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     医院挂号系统后端服务                                ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  环境: ${process.env.NODE_ENV || 'development'}${' '.repeat(42 - (process.env.NODE_ENV || 'development').length)}║
║  端口: ${PORT}${' '.repeat(44 - String(PORT).length)}║
║  地址: http://localhost:${PORT}${' '.repeat(34 - String(PORT).length)}║
║                                                        ║
║  API 文档: http://localhost:${PORT}/api/* ${' '.repeat(28 - String(PORT).length)}║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err);
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', { reason, promise });
  console.error('未处理的 Promise 拒绝:', reason);
});

module.exports = app;
