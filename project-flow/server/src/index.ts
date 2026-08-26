import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

// 健康检查路由
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 全局统一 JSON 错误处理中间件 (Express 5 异常捕获)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('💥 未捕获的服务器异常:', err);
  res.status(500).json({
    message: err?.message || '服务器内部发生错误，请稍后重试',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端 REST API 服务已启动: http://localhost:${PORT}`);
});
