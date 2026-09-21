import 'dotenv/config';
import { createApp } from './app';
import { db } from './prisma/db';
import { createPrismaRepositories } from './repositories/prisma-repositories';
import pool, { registerFatalErrorHandler } from './database/pool';

const PORT = process.env.PORT || 3001;

const app = createApp({
  repos: createPrismaRepositories(db),
  healthCheck: () => pool.query('SELECT 1;'),
});

const server = app.listen(PORT, () => {
  console.log(`后端 REST API 服务已启动: http://localhost:${PORT}`);
});

// 优雅停机控制器 (具备幂等守卫/超时强制退出保护/统一异常收敛)
let isShuttingDown = false;

export const gracefulShutdown = async (reason: string, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`\n[Shutdown] 正在优雅关闭服务 (原因: ${reason})...`);

  // 10 秒强制退出兜底保护
  const forceExitTimer = setTimeout(() => {
    console.error('[Shutdown] 优雅停机超时 (10s), 强制退出进程');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close(async (serverErr) => {
    if (serverErr) {
      console.error('[Shutdown] 关闭 HTTP 服务异常:', serverErr);
    } else {
      console.log('[Shutdown] HTTP 服务器已停止接收新连接');
    }

    try {
      await pool.end();
      console.log('[Shutdown] PostgreSQL 连接池已安全释放');
    } catch (poolErr) {
      console.error('[Shutdown] 关闭数据库连接池异常:', poolErr);
    } finally {
      process.exit(exitCode);
    }
  });
};

// 统一绑定致命数据库错误退出
registerFatalErrorHandler((err: Error) => {
  console.error('[Fatal DB Error] 捕获数据库客户端致命异常, 执行停机:', err);
  gracefulShutdown('Fatal Database Error', 1);
});

// 使用 process.once 避免重复监听或并发冲突
process.once('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM', 0));

