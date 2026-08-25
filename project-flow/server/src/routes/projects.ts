import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/projects - 获取所有项目
router.get('/', (_req: Request, res: Response) => {
  res.json(db.getProjects());
});

// POST /api/projects - 创建新项目
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: '项目名称不能为空' });
  }
  const newProject = db.addProject(name.trim());
  res.status(201).json(newProject);
});

// DELETE /api/projects/:id - 删除项目（级联删除相关任务）
router.delete('/:id', (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: '无效的项目 ID,必须为正整数' });
  }

  const success = db.deleteProject(id);
  if (!success) {
    return res.status(404).json({ message: '未找到指定项目' });
  }
  res.json({ message: '项目删除成功' });
});

export default router;
