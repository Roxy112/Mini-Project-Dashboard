import type { Project, Task } from '../../../shared/types';
import { DataRepositories } from '../types/repository';
import type { db as RealDb } from '../prisma/db';

/**
 * 将数据库原始记录安全映射为领域 Task 实体
 * 基于 PostgreSQL schema.sql 中的 CHECK (priority IN ('low', 'medium', 'high')) 约束收窄类型,
 * 并提供运行期守卫, 若数据库数据异常则抛出错误
 */
export function mapRowToTask(row: {
  id: number;
  projectId: number;
  text: string;
  done: boolean;
  priority: string;
  dueDate: string | null;
  description: string | null;
}): Task {
  if (row.priority !== 'low' && row.priority !== 'medium' && row.priority !== 'high') {
    throw new Error(`数据库任务优先级数据异常: 收到无效的优先级值 "${row.priority}"`);
  }
  return {
    id: row.id,
    projectId: row.projectId,
    text: row.text,
    done: row.done,
    priority: row.priority,
    dueDate: row.dueDate,
    description: row.description,
  };
}

export function createPrismaRepositories(database: typeof RealDb): DataRepositories {
  return {
    projects: {
      async getAll(): Promise<Project[]> {
        const rows = await database.orm.public.Project
          .select('id', 'name')
          .orderBy((p) => p.id.asc())
          .all();
        return rows.map((r) => ({ id: r.id, name: r.name }));
      },
      async create(data: { name: string }): Promise<Project> {
        const row = await database.orm.public.Project.create({ name: data.name });
        return { id: row.id, name: row.name };
      },
      async delete(id: number): Promise<boolean> {
        const res = await database.orm.public.Project.where({ id }).delete();
        return Boolean(res);
      },
    },
    tasks: {
      async getAll(projectId?: number): Promise<Task[]> {
        const collection = projectId !== undefined
          ? database.orm.public.Task.where({ projectId })
          : database.orm.public.Task;
        const rows = await collection
          .select('id', 'projectId', 'text', 'done', 'priority', 'dueDate', 'description')
          .orderBy((t) => t.id.asc())
          .all();
        return rows.map(mapRowToTask);
      },
      async create(data): Promise<Task> {
        const row = await database.orm.public.Task.create({
          text: data.text,
          priority: data.priority,
          projectId: data.projectId,
          dueDate: data.dueDate || null,
          description: data.description || null,
        });
        return mapRowToTask(row);
      },
      async update(id, updates): Promise<Task | null> {
        const row = await database.orm.public.Task.where({ id }).update(updates);
        if (!row) return null;
        return mapRowToTask(row);
      },
      async delete(id: number): Promise<boolean> {
        const res = await database.orm.public.Task.where({ id }).delete();
        return Boolean(res);
      },
    },
  };
}

