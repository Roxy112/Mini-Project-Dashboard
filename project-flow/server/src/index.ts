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

app.listen(PORT, () => {
  console.log(`🚀 后端 REST API 服务已启动: http://localhost:${PORT}`);
});
