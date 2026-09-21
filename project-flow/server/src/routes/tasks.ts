import { Router, Request, Response, NextFunction } from 'express';
import { Priority, ValidationErrorDetail } from '../../../shared/types';
import { sendValidationError, sendNotFoundError, sendBadRequestError } from '../utils/api-error';
import { TaskRepository } from '../types/repository';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

/**
 * 类型守卫: 校验未知输入是否为合法的 Priority
 */
function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (VALID_PRIORITIES as readonly string[]).includes(value);
}

/**
 * 校验字符串是否为合法的 YYYY-MM-DD 格式且日历有效
 */
function isValidDateString(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * 获取当前日期的 YYYY-MM-DD 字符串 (本地时间)
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createTaskRouter(repo: TaskRepository): Router {
  const router = Router();

  // GET /api/tasks - 获取任务列表 (支持可选 query ?projectId=xxx)
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectIdQuery = req.query.projectId;
      let projectId: number | undefined = undefined;

      if (projectIdQuery !== undefined) {
        const parsed = typeof projectIdQuery === 'string' ? Number(projectIdQuery) : NaN;
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return sendBadRequestError(res, 'INVALID_PROJECT_ID', '查询参数 projectId 无效, 必须为正整数');
        }
        projectId = parsed;
      }

      const tasks = await repo.getAll(projectId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/tasks - 创建新任务
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, priority, projectId, dueDate, description } = req.body || {};
      const details: ValidationErrorDetail[] = [];

      // 1. text 字段校验
      if (text === undefined || text === null) {
        details.push({ field: 'text', issue: 'REQUIRED', message: '任务内容不能为空' });
      } else if (typeof text !== 'string') {
        details.push({ field: 'text', issue: 'INVALID_TYPE', message: '任务内容必须为字符串' });
      } else if (!text.trim()) {
        details.push({ field: 'text', issue: 'INVALID_VALUE', message: '任务内容不能为空白' });
      } else if (text.trim().length > 500) {
        details.push({ field: 'text', issue: 'TOO_LONG', message: '任务内容长度不能超过 500 个字符' });
      }

      // 2. projectId 字段校验
      if (projectId === undefined || projectId === null) {
        details.push({ field: 'projectId', issue: 'REQUIRED', message: '所属项目 ID 不能为空' });
      } else if (typeof projectId !== 'number') {
        details.push({ field: 'projectId', issue: 'INVALID_TYPE', message: '所属项目 ID 必须为数字' });
      } else if (!Number.isInteger(projectId) || projectId <= 0) {
        details.push({ field: 'projectId', issue: 'INVALID_VALUE', message: '所属项目 ID 无效, 必须为正整数' });
      }

      // 3. priority 字段校验 (仅未提供时默认为 medium, 显式传 null 或非法值均视为类型/取值错误)
      let taskPriority: Priority = 'medium';
      if (priority !== undefined) {
        if (priority === null || typeof priority !== 'string') {
          details.push({ field: 'priority', issue: 'INVALID_TYPE', message: '优先级必须为字符串' });
        } else if (!isPriority(priority)) {
          details.push({ field: 'priority', issue: 'INVALID_VALUE', message: '优先级必须为 low, medium 或 high' });
        } else {
          taskPriority = priority;
        }
      }

      // 4. dueDate 字段校验 (YYYY-MM-DD 且不能早于今天)
      if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
        if (typeof dueDate !== 'string') {
          details.push({ field: 'dueDate', issue: 'INVALID_TYPE', message: '截止日期必须为字符串' });
        } else if (!isValidDateString(dueDate)) {
          details.push({ field: 'dueDate', issue: 'INVALID_VALUE', message: '截止日期必须为合法的 YYYY-MM-DD 格式 (例如: 2026-08-30)' });
        } else if (dueDate < getTodayDateString()) {
          details.push({ field: 'dueDate', issue: 'PAST_DATE', message: '截止日期不能早于今天' });
        }
      }

      // 5. description 字段校验
      if (description !== undefined && description !== null) {
        if (typeof description !== 'string') {
          details.push({ field: 'description', issue: 'INVALID_TYPE', message: '任务描述必须为字符串' });
        } else if (description.trim().length > 1000) {
          details.push({ field: 'description', issue: 'TOO_LONG', message: '任务描述长度不能超过 1000 个字符' });
        }
      }

      if (details.length > 0) {
        return sendValidationError(res, details);
      }

      const newTask = await repo.create({
        text: (text as string).trim(),
        priority: taskPriority,
        projectId: projectId as number,
        dueDate: (dueDate as string) || null,
        description: description ? (description as string).trim() || null : null,
      });
      res.status(201).json(newTask);
    } catch (error) {
      // 捕获外键约束异常 (PostgreSQL SQLSTATE 23503: foreign_key_violation)
      const dbError = error as {
        sqlState?: string;
        constraint?: string;
        cause?: { constraint?: string; code?: string };
      };
      if (
        dbError?.sqlState === '23503' ||
        dbError?.constraint === 'tasks_project_id_fkey' ||
        dbError?.cause?.constraint === 'tasks_project_id_fkey'
      ) {
        return sendNotFoundError(res, 'PROJECT_NOT_FOUND', '所属项目不存在, 无法创建任务');
      }
      next(error);
    }
  });

  // PATCH /api/tasks/:id - 部分更新任务
  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
      if (!Number.isInteger(id) || id <= 0) {
        return sendBadRequestError(res, 'INVALID_TASK_ID', '无效的任务 ID, 必须为正整数');
      }

      const { text, done, priority, dueDate, description } = req.body || {};
      const details: ValidationErrorDetail[] = [];
      const updateData: {
        text?: string;
        done?: boolean;
        priority?: Priority;
        dueDate?: string | null;
        description?: string | null;
      } = {};

      if (text !== undefined) {
        if (typeof text !== 'string') {
          details.push({ field: 'text', issue: 'INVALID_TYPE', message: '任务内容必须为字符串' });
        } else if (!text.trim()) {
          details.push({ field: 'text', issue: 'INVALID_VALUE', message: '任务内容不能为空白' });
        } else if (text.trim().length > 500) {
          details.push({ field: 'text', issue: 'TOO_LONG', message: '任务内容长度不能超过 500 个字符' });
        } else {
          updateData.text = text.trim();
        }
      }

      if (done !== undefined) {
        if (typeof done !== 'boolean') {
          details.push({ field: 'done', issue: 'INVALID_TYPE', message: '任务完成状态必须为布尔值' });
        } else {
          updateData.done = done;
        }
      }

      if (priority !== undefined) {
        if (priority === null || typeof priority !== 'string') {
          details.push({ field: 'priority', issue: 'INVALID_TYPE', message: '优先级必须为字符串' });
        } else if (!isPriority(priority)) {
          details.push({ field: 'priority', issue: 'INVALID_VALUE', message: '优先级必须为 low, medium 或 high' });
        } else {
          updateData.priority = priority;
        }
      }

      if (dueDate !== undefined) {
        if (dueDate === null || dueDate === '') {
          updateData.dueDate = null;
        } else if (typeof dueDate !== 'string') {
          details.push({ field: 'dueDate', issue: 'INVALID_TYPE', message: '截止日期必须为字符串' });
        } else if (!isValidDateString(dueDate)) {
          details.push({ field: 'dueDate', issue: 'INVALID_VALUE', message: '截止日期必须为合法的 YYYY-MM-DD 格式 (例如: 2026-08-30)' });
        } else if (dueDate < getTodayDateString()) {
          details.push({ field: 'dueDate', issue: 'PAST_DATE', message: '截止日期不能早于今天' });
        } else {
          updateData.dueDate = dueDate;
        }
      }

      if (description !== undefined) {
        if (description === null) {
          updateData.description = null;
        } else if (typeof description !== 'string') {
          details.push({ field: 'description', issue: 'INVALID_TYPE', message: '任务描述必须为字符串' });
        } else if (description.trim().length > 1000) {
          details.push({ field: 'description', issue: 'TOO_LONG', message: '任务描述长度不能超过 1000 个字符' });
        } else {
          updateData.description = description.trim() || null;
        }
      }

      if (details.length > 0) {
        return sendValidationError(res, details);
      }

      if (Object.keys(updateData).length === 0) {
        return sendBadRequestError(res, 'NO_TASK_UPDATES', '未提供任何有效的可更新字段');
      }

      const updatedTask = await repo.update(id, updateData);
      if (!updatedTask) {
        return sendNotFoundError(res, 'TASK_NOT_FOUND', '未找到指定任务');
      }
      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/tasks/:id - 删除任务
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
      if (!Number.isInteger(id) || id <= 0) {
        return sendBadRequestError(res, 'INVALID_TASK_ID', '无效的任务 ID, 必须为正整数');
      }

      const success = await repo.delete(id);
      if (!success) {
        return sendNotFoundError(res, 'TASK_NOT_FOUND', '未找到指定任务');
      }
      res.json({ message: '任务删除成功' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}