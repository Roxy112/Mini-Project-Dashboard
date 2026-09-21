import express from 'express';
import cors from 'cors';
import { createProjectRouter } from './routes/projects';
import { createTaskRouter } from './routes/tasks';
import { AppError, sendApiError, sendNotFoundError } from './utils/api-error';
import { DataRepositories } from './types/repository';

export interface AppOptions {
  repos: DataRepositories;
  healthCheck: () => Promise<unknown>; // 必填项: 强制执行
}

export function createApp(options: AppOptions): express.Express {
  const app = express();
  const { repos, healthCheck } = options;

  // 基础中间件
  app.use(cors());
  app.use(express.json());

  // 业务路由
  app.use('/api/projects', createProjectRouter(repos.projects));
  app.use('/api/tasks', createTaskRouter(repos.tasks));

  // 健康检查路由 (显式等待必填的 healthCheck 并在异常时返回 503)
  app.get('/api/health', async (_req, res) => {
    try {
      await healthCheck();
      res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error('Database health check failed', error);
      return sendApiError(res, 503, 'SERVICE_UNAVAILABLE', '数据库服务暂不可用');
    }
  });

  // API 404 兜底路由 (放在所有具体 API 路由之后, 错误中间件之前)
  app.use('/api', (_req, res) => {
    return sendNotFoundError(res, 'ROUTE_NOT_FOUND', '未找到请求的 API 端点');
  });

  // 全局统一错误处理中间件
  app.use((
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      return next(err);
    }

    if (err instanceof AppError) {
      return sendApiError(res, err.status, err.code, err.message, err.details);
    }

    const parsedErr = err as { status?: number; type?: string };
    if (parsedErr?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
      return sendApiError(res, 400, 'INVALID_JSON', '请求体 JSON 格式非法');
    }
    if (parsedErr?.type === 'entity.too.large' || parsedErr?.status === 413) {
      return sendApiError(res, 413, 'PAYLOAD_TOO_LARGE', '请求体体积超出服务器限制');
    }
    if (parsedErr?.type === 'charset.unsupported' || parsedErr?.type === 'encoding.unsupported') {
      return sendApiError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', '不支持的内容编码或字符集');
    }

    console.error('未捕获的服务器异常:', err);
    return sendApiError(res, 500, 'INTERNAL_SERVER_ERROR', '服务器内部发生错误, 请稍后重试');
  });

  return app;
}

