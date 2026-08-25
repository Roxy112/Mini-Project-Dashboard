import { Project, Task, CreateTaskParams, UpdateTaskParams } from '../types/index';

const BASE_URL = '/api';

/**
 * 统一请求封装函数
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
    throw new Error(errorBody.message || `请求失败: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Project 相关 API
  getProjects: () => request<Project[]>('/projects'),
  createProject: (name: string) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteProject: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Task 相关 API
  getTasks: (projectId?: number) =>
    request<Task[]>(projectId !== undefined ? `/tasks?projectId=${projectId}` : '/tasks'),
  createTask: (params: CreateTaskParams) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  updateTask: (id: number, updates: UpdateTaskParams) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteTask: (id: number) =>
    request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};
