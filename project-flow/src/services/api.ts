import { Project, Task, CreateTaskParams, UpdateTaskParams } from '../types/index';

const BASE_URL = '/api';

/**
 * 自定义 API 请求异常类
 * 封装 HTTP 状态码以及后端返回的错误详情结构
 */
export class ApiError extends Error {
  /** HTTP 响应状态码 */
  public readonly status: number;
  /** 接口返回的详细错误信息或结构体 */
  public readonly details?: unknown;

  /**
   * 创建 ApiError 实例
   * @param message 错误提示信息
   * @param status HTTP 响应状态码, 默认 500
   * @param details 可选的附加错误详情
   */
  constructor(message: string, status: number = 500, details?: unknown) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * 统一请求封装函数
 * @template T 预期的响应体数据结构类型
 * @param endpoint 相对接口路径, 例如 '/projects'
 * @param options 请求配置选项 (继承自 fetch 的 RequestInit)
 * @returns 解析后的响应 JSON 数据
 * @throws {ApiError} 当响应状态码非 2xx 时抛出自定义异常
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody.message || `HTTP ${res.status}${res.statusText ? ` (${res.statusText})` : ''}`;
    throw new ApiError(message, res.status, errorBody);
  }

  return res.json();
}

/**
 * 前端 API 统一调用服务
 */
export const api = {
  // Project 相关 API
  /** 获取所有项目列表 */
  getProjects: () => request<Project[]>('/projects'),
  /** 创建新项目 */
  createProject: (name: string) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  /** 根据项目 ID 删除指定项目 */
  deleteProject: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Task 相关 API
  /** 获取任务列表, 可选传入 projectId 过滤所属项目的任务 */
  getTasks: (projectId?: number) =>
    request<Task[]>(projectId !== undefined ? `/tasks?projectId=${projectId}` : '/tasks'),
  /** 创建新任务 */
  createTask: (params: CreateTaskParams) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  /** 更新指定 ID 的任务信息 */
  updateTask: (id: number, updates: UpdateTaskParams) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  /** 根据任务 ID 删除指定任务 */
  deleteTask: (id: number) =>
    request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};
