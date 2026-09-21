import { Router, Request, Response, NextFunction } from 'express';
import { ValidationErrorDetail } from '../../../shared/types';
import { sendValidationError, sendNotFoundError, sendBadRequestError } from '../utils/api-error';
import { ProjectRepository } from '../types/repository';

export function createProjectRouter(repo: ProjectRepository): Router {
  const router = Router();

  // GET /api/projects - 获取所有项目
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await repo.getAll();
      res.status(200).json(projects);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/projects - 创建新项目
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body || {};
      const details: ValidationErrorDetail[] = [];

      if (name === undefined || name === null) {
        details.push({ field: 'name', issue: 'REQUIRED', message: '项目名称不能为空' });
      } else if (typeof name !== 'string') {
        details.push({ field: 'name', issue: 'INVALID_TYPE', message: '项目名称必须为字符串' });
      } else if (!name.trim()) {
        details.push({ field: 'name', issue: 'INVALID_VALUE', message: '项目名称不能为空白' });
      } else if (name.trim().length > 100) {
        details.push({ field: 'name', issue: 'TOO_LONG', message: '项目名称长度不能超过 100 个字符' });
      }

      if (details.length > 0) {
        return sendValidationError(res, details);
      }

      const newProject = await repo.create({ name: (name as string).trim() });
      res.status(201).json(newProject);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/projects/:id - 删除项目 (级联删除相关任务)
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
      if (!Number.isInteger(id) || id <= 0) {
        return sendBadRequestError(res, 'INVALID_PROJECT_ID', '无效的项目 ID, 必须为正整数');
      }

      const success = await repo.delete(id);
      if (!success) {
        return sendNotFoundError(res, 'PROJECT_NOT_FOUND', '未找到指定项目');
      }
      res.json({ message: '项目删除成功' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
