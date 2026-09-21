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

import { ApiErrorCode, ValidationErrorDetail } from '../../shared/types';

/**
 * 统一操作结果类型 (Discriminated Union)
 * 用于在组件间传递异步操作执行结果与失败信息
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; code?: ApiErrorCode; details?: ValidationErrorDetail[] };

/**
 * 统一格式化错误信息工具函数:
 * 优先将结构化的 details 字段拼接为易读提示, 无有效明细时回退到顶层 message
 */
export function formatErrorMessage(result: { message: string; details?: ValidationErrorDetail[] }): string {
  if (result.details && result.details.length > 0) {
    const detailStr = result.details
      .map(d => d.message || `${d.field}: ${d.issue}`)
      .join('; ');
    return `${result.message} (${detailStr})`;
  }
  return result.message;
}
