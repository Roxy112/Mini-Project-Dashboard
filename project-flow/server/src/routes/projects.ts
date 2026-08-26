import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /api/projects - 获取所有项目
router.get('/', async (_req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    orderBy: { id: 'asc' },
  });
  res.json(projects);
});

// POST /api/projects - 创建新项目
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: '项目名称不能为空' });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    return res.status(400).json({ message: '项目名称长度不能超过 100 个字符' });
  }
  const newProject = await prisma.project.create({
    data: { name: trimmedName },
  });
  res.status(201).json(newProject);
});

// DELETE /api/projects/:id - 删除项目（级联删除相关任务通过数据库外键关系自动完成）
router.delete('/:id', async (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: '无效的项目 ID,必须为正整数' });
  }

  try {
    await prisma.project.delete({
      where: { id },
    });
    res.json({ message: '项目删除成功' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: '未找到指定项目' });
    }
    throw error;
  }
});

export default router;
