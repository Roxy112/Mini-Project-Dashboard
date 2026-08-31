import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/pool';

const router = Router();

// GET /api/projects - 获取所有项目
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT id, name FROM projects ORDER BY id ASC;');
    res.status(200).json(result.rows);
  } catch (error) {
    next(error); // 传递给全局统一 Error Handler 处理
  }
});

// POST /api/projects - 创建新项目
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: '项目名称不能为空' });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ message: '项目名称长度不能超过 100 个字符' });
    }

    const result = await pool.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING id, name;',
      [trimmedName]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - 删除项目（级联删除相关任务）
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? Number(req.params.id) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: '无效的项目 ID，必须为正整数' });
    }

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '未找到指定项目' });
    }
    res.json({ message: '项目删除成功' });
  } catch (error) {
    next(error);
  }
});

export default router;
