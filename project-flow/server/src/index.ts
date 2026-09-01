import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './database/pool';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(cors());
app.use(express.json());

// 注册 RESTful API 路由模块
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// 健康检查路由 (检查 Express 与 PostgreSQL 存活状态)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1;');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Database health check failed', error);

    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection error',
      timestamp: new Date().toISOString(),
    });
  }
});

// 全局统一 JSON 错误处理中间件 (Express 5 异常捕获)
app.use((err: unknown, 
  _req: express.Request, 
  res: express.Response, 
  _next: express.NextFunction
) => {
  console.error('💥 未捕获的服务器异常:', err);

  res.status(500).json({
    message : '服务器内部发生错误，请稍后重试',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端 REST API 服务已启动: http://localhost:${PORT}`);
});
