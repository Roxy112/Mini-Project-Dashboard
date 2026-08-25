import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/tasks - 获取任务列表（支持可选 query ?projectId=xxx）
router.get('/', (req: Request, res: Response) => {
  const projectIdQuery = req.query.projectId;
  const projectId = projectIdQuery ? parseInt(projectIdQuery as string, 10) : undefined;
  res.json(db.getTasks(projectId));
});

// POST /api/tasks - 创建新任务
router.post('/', (req: Request, res: Response) => {
  const { text, priority, projectId, dueDate } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: '任务内容不能为空' });
  }
  if (!projectId || typeof projectId !== 'number') {
    return res.status(400).json({ message: '所属项目 ID 无效' });
  }

  const newTask = db.addTask({
    text: text.trim(),
    priority: priority || 'medium',
    projectId,
    dueDate,
  });
  res.status(201).json(newTask);
});

// PATCH /api/tasks/:id - 部分更新任务（状态、文本、优先级等）
router.patch('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: '无效的任务 ID' });
  }

  const updatedTask = db.updateTask(id, req.body);
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