import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/tasks - 获取任务列表（支持可选 query ?projectId=xxx）
router.get('/', (req: Request, res: Response) => {
  const projectIdQuery = req.query.projectId;
  let projectId: number | undefined = undefined;

  if (projectIdQuery !== undefined) {
    const parsed = typeof projectIdQuery === 'string' ? Number(projectIdQuery) : NaN;
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({ message: '查询参数 projectId 无效，必须为正整数' });
    }
    projectId = parsed;
  }

  res.json(db.getTasks(projectId));
});

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

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

// POST /api/tasks - 创建新任务
router.post('/', (req: Request, res: Response) => {
  const { text, priority, projectId, dueDate } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: '任务内容不能为空且必须为字符串' });
  }
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ message: '所属项目 ID 无效，必须为正整数' });
  }

  // 模拟外键约束：检查关联的项目是否存在
  const project = db.getProjectById(projectId);
  if (!project) {
    return res.status(404).json({ message: '所属项目不存在，无法创建任务' });
  }

  let taskPriority: 'low' | 'medium' | 'high' = 'medium';
  if (priority !== undefined) {
    if (typeof priority !== 'string' || !VALID_PRIORITIES.includes(priority as any)) {
      return res.status(400).json({ message: '优先级必须为 low, medium 或 high' });
    }
    taskPriority = priority as 'low' | 'medium' | 'high';
  }

  if (dueDate !== undefined) {
    if (!isValidDateString(dueDate)) {
      return res.status(400).json({ message: '截止日期必须为合法的 YYYY-MM-DD 格式 (例如: 2026-08-30)' });
    }
  }

  const newTask = db.addTask({
    text: text.trim(),
    priority: taskPriority,
    projectId,
    dueDate,
  });
  res.status(201).json(newTask);
});

// PATCH /api/tasks/:id - 部分更新任务（状态、文本、优先级、截止日期）
router.patch('/:id', (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: '无效的任务 ID，必须为正整数' });
  }

  // 1. 严格白名单解构（忽略 req.body 中的 id, projectId 和任何未知字段）
  const { text, done, priority, dueDate } = req.body || {};
  const updates: {
    text?: string;
    done?: boolean;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
  } = {};

  // 2. text 字段校验 (string & trim 后非空)
  if (text !== undefined) {
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: '任务内容不能为空且必须为字符串' });
    }
    updates.text = text.trim();
  }

  // 3. done 字段校验 (boolean)
  if (done !== undefined) {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ message: '任务完成状态必须为布尔值' });
    }
    updates.done = done;
  }

  // 4. priority 字段校验 ('low' | 'medium' | 'high')
  if (priority !== undefined) {
    if (typeof priority !== 'string' || !VALID_PRIORITIES.includes(priority as any)) {
      return res.status(400).json({ message: '优先级必须为 low, medium 或 high' });
    }
    updates.priority = priority as 'low' | 'medium' | 'high';
  }

  // 5. dueDate 字段校验 (YYYY-MM-DD 且日历有效)
  if (dueDate !== undefined) {
    if (!isValidDateString(dueDate)) {
      return res.status(400).json({ message: '截止日期必须为合法的 YYYY-MM-DD 格式 (例如: 2026-08-30)' });
    }
    updates.dueDate = dueDate;
  }

  // 6. 检查是否提供了至少一个有效可更新字段
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: '未提供任何有效的可更新字段' });
  }

  // 7. 只向底层数据库传递经过验证的安全 updates 对象
  const updatedTask = db.updateTask(id, updates);
  if (!updatedTask) {
    return res.status(404).json({ message: '未找到指定任务' });
  }
  res.json(updatedTask);
});

// DELETE /api/tasks/:id - 删除任务
router.delete('/:id', (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: '无效的任务 ID，必须为正整数' });
  }

  const success = db.deleteTask(id);
  if (!success) {
    return res.status(404).json({ message: '未找到指定任务' });
  }
  res.json({ message: '任务删除成功' });
});

export default router;