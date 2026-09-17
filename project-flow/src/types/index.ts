// 导出前后端共享的核心实体模型
export * from '../../shared/types';
import { Priority, Task } from '../../shared/types';

// 前端专用的 UI 状态与过滤类型
export type StatusFilter = 'all' | 'active' | 'completed';
export type PriorityFilter = 'all' | Priority;

// 表单输入数据 (由 Tasks 表单组件收集)
export interface TaskFormData {
  text: string;
  priority: Priority;
  dueDate?: string;
  description?: string;
}

// 创建任务请求参数 (发送给 API / 后端)
export interface CreateTaskParams extends TaskFormData {
  projectId: number;
}

/**
 * 任务更新参数类型 (允许修改除 id 与 projectId 外的字段)
 */
export type UpdateTaskParams = Partial<Omit<Task, 'id' | 'projectId'>>;

/**
 * 统一操作结果类型 (Discriminated Union)
 * 用于在组件间传递异步操作执行结果与失败信息
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; message: string };
