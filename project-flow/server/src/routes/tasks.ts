import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../prisma/db'; 
import { Priority } from '../../../shared/types';

const router = Router();

/**
 * 格式化任务返回对象，严格提取为 YYYY-MM-DD 字符串或 null，覆盖原 dueDate 属性类型
 */
function formatTask<T extends { dueDate?: Date | string | null }>(
  task: T
): Omit<T, 'dueDate'> & { dueDate: string | null } {
  const { dueDate, ...rest } = task;
  let formattedDate: string | null = null;

  if (dueDate instanceof Date) {
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    formattedDate = `${year}-${month}-${day}`;
  } else if (typeof dueDate === 'string') {
    formattedDate = dueDate.split('T')[0] || null;
  } else if (dueDate && typeof (dueDate as {toString: () => string}).toString === 'function') {
    formattedDate = String(dueDate).split('T')[0] || null;
  }

  return {
    ...rest,
    dueDate: formattedDate,
  } as Omit<T, 'dueDate'> & { dueDate: string | null };
}

// GET /api/tasks - 获取任务列表（支持可选 query ?projectId=xxx）
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectIdQuery = req.query.projectId;
    let projectId: number | undefined = undefined;

    if (projectIdQuery !== undefined) {
      const parsed = typeof projectIdQuery === 'string' ? Number(projectIdQuery) : NaN;
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ message: '查询参数 projectId 无效，必须为正整数' });
      }
      projectId = parsed;
    }

    const collection = projectId !== undefined
      ? db.orm.public.Task.where({ projectId })
      : db.orm.public.Task;

    const tasks = await collection
      .select("id", "projectId", "text", "done", "priority", "dueDate")
      .orderBy((task) => task.id.asc())
      .all();

    res.json(tasks.map(formatTask));
  } catch (error) {
    next(error);
  }
});

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

/**
 * 类型守卫：校验未知输入是否为合法的 Priority
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

// POST /api/tasks - 创建新任务
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, priority, projectId, dueDate } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: '任务内容不能为空且必须为字符串' });
    }
    const trimmedText = text.trim();
    if (trimmedText.length > 500) {
      return res.status(400).json({ message: '任务内容长度不能超过 500 个字符' });
    }

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ message: '所属项目 ID 无效，必须为正整数' });
    }

    // 检查关联的项目是否存在
    const project = await db.orm.public.Project.first({id: projectId});
    if (!project) {
      return res.status(404).json({ message: '所属项目不存在，无法创建任务' });
    }

    let taskPriority: Priority = 'medium';
    if (priority !== undefined) {
      if (!isPriority(priority)) {
        return res.status(400).json({ message: '优先级必须为 low, medium 或 high' });
      }
      taskPriority = priority;
    }

    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      if (!isValidDateString(dueDate)) {
        return res.status(400).json({ message: '截止日期必须为合法的 YYYY-MM-DD 格式 (例如: 2026-08-30)' });
      }
      if (dueDate < getTodayDateString()) {
        return res.status(400).json({ message: '截止日期不能早于今天' });
      }
    }

    const newTask = await db.orm.public.Task.create({
      text: trimmedText,
      priority: taskPriority,
      projectId,
      dueDate: dueDate || null,
    });
    res.status(201).json(formatTask(newTask));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id - 部分更新任务（状态、文本、优先级、截止日期）
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: '无效的任务 ID，必须为正整数' });
    }

    // 1. 严格白名单解构（忽略 req.body 中的 id, projectId 和任何未知字段）
    const { text, done, priority, dueDate } = req.body || {};
    const updateData: {
      text?: string;
      done?: boolean;
      priority?: Priority;
      dueDate?: string | null;
    } = {};

    // 2. text 字段校验 (string & trim 后非空，最长 500 字符)
    if (text !== undefined) {
      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: '任务内容不能为空且必须为字符串' });
      }
      const trimmed = text.trim();
      if (trimmed.length > 500) {
        return res.status(400).json({ message: '任务内容长度不能超过 500 个字符' });
      }
      updateData.text = trimmed;
    }

    // 3. done 字段校验 (boolean)
    if (done !== undefined) {
      if (typeof done !== 'boolean') {
        return res.status(400).json({ message: '任务完成状态必须为布尔值' });
      }
      updateData.done = done;
    }

    // 4. priority 字段校验 ('low' | 'medium' | 'high')
    if (priority !== undefined) {
      if (!isPriority(priority)) {
        return res.status(400).json({ message: '优先级必须为 low, medium 或 high' });
      }
      updateData.priority = priority;
    }

    // 5. dueDate 字段校验 (YYYY-MM-DD 且不可早于今天，或允许传 null / '' 进行清除)
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        updateData.dueDate = null;
      } else {
        if (!isValidDateString(dueDate)) {
          return res.status(400).json({ message: '截止日期必须为合法的 YYYY-MM-DD 格式 (例如: 2026-08-30)' });
        }
        if (dueDate < getTodayDateString()) {
          return res.status(400).json({ message: '截止日期不能早于今天' });
        }
        updateData.dueDate = dueDate;
      }
    }

    // 6. 检查是否提供了至少一个有效可更新字段
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: '未提供任何有效的可更新字段' });
    }

    // 7. 执行更新
    const updatedTask = await db.orm.public.Task
      .where({ id })
      .update(updateData);

    if (!updatedTask) {
      return res.status(404).json({ message: '未找到指定任务' });
    }
    res.json(formatTask(updatedTask));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - 删除任务
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: '无效的任务 ID，必须为正整数' });
    }

    const deletedTask = await db.orm.public.Task
      .where({ id })
      .delete();
    if (!deletedTask) {
      return res.status(404).json({ message: '未找到指定任务' });
    }
    res.json({ message: '任务删除成功' });
  } catch (error) {
    next(error);
  }
});

export default router;