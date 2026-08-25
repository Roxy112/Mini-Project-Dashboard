import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/tasks - 获取任务列表（支持可选 query ?projectId=xxx）
router.get('/', (req: Request, res: Response) => {
  const projectIdQuery = req.query.projectId;
  const projectId = projectIdQuery ? parseInt(projectIdQuery as string, 10) : undefined;
  res.json(db.getTasks(projectId));
});

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

// POST /api/tasks - 创建新任务
router.post('/', (req: Request, res: Response) => {
  const { text, priority, projectId, dueDate } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: '任务内容不能为空且必须为字符串' });
  }
  if (!projectId || typeof projectId !== 'number') {
    return res.status(400).json({ message: '所属项目 ID 无效' });
  }

  const taskPriority = priority || 'medium';
  if (!VALID_PRIORITIES.includes(taskPriority)) {
    return res.status(400).json({ message: '优先级必须为 low, medium 或 high' });
  }

  if (dueDate !== undefined && typeof dueDate !== 'string') {
    return res.status(400).json({ message: '截止日期必须为字符串' });
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: '无效的任务 ID' });
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

  // 5. dueDate 字段校验 (string)
  if (dueDate !== undefined) {
    if (typeof dueDate !== 'string') {
      return res.status(400).json({ message: '截止日期必须为字符串' });
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: '无效的任务 ID' });
  }

  const success = db.deleteTask(id);
  if (!success) {
    return res.status(404).json({ message: '未找到指定任务' });
  }
  res.json({ message: '任务删除成功' });
});

export default router;