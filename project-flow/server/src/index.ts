import 'dotenv/config';
import { createApp } from './app';
import { db } from './prisma/db';
import { createPrismaRepositories } from './repositories/prisma-repositories';
import pool, { registerFatalErrorHandler } from './database/pool';
import { createShutdownController } from './shutdown';

const PORT = process.env.PORT || 3001;

const app = createApp({
  repos: createPrismaRepositories(db),
  healthCheck: async () => {
    // 验证共享 Prisma 客户端及最小业务表读取路径可用 (即便表为空返回 null 亦代表连接正常)
    await db.orm.public.Project.select('id').first();
  },
});

const server = app.listen(PORT, () => {
  console.log(`后端 REST API 服务已启动: http://localhost:${PORT}`);
});

export const shutdownController = createShutdownController({
  server,
  db,
  pool,
  exitProcess: (code) => process.exit(code),
});

export const gracefulShutdown = shutdownController.shutdown;

// 统一绑定致命数据库错误退出
registerFatalErrorHandler((err: Error) => {
  console.error('[Fatal DB Error] 捕获数据库客户端致命异常, 执行停机:', err);
  gracefulShutdown('Fatal Database Error', 1);
});

// 使用 process.once 避免重复监听或并发冲突
process.once('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM', 0));

