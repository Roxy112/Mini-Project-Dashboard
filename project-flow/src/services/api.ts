import {
  Project,
  Task,
  CreateTaskParams,
  UpdateTaskParams,
  ApiErrorCode,
  ValidationErrorDetail,
  API_ERROR_CODE_SET,
  VALIDATION_ISSUE_SET,
  ValidationIssue,
  ActionResult,
} from '../types/index';

const BASE_URL = '/api';

/**
 * 将未知错误安全转换为标准的失败 ActionResult
 */
export function toFailedActionResult(err: unknown): Extract<ActionResult, { ok: false }> {
  if (err instanceof ApiError) {
    return {
      ok: false,
      message: err.message,
      code: err.code,
      details: err.details,
    };
  }
  const message = err instanceof Error ? err.message : '未知错误';
  return { ok: false, message };
}

/**
 * 防御式解析后端响应内容为标准错误结构
 */
export function parseApiErrorBody(
  bodyText: string,
  status: number,
  statusText: string
): { message: string; code?: ApiErrorCode; details?: ValidationErrorDetail[]; rawBody: unknown } {
  let parsed: unknown = null;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    parsed = null;
  }

  let message = `HTTP ${status}${statusText ? ` (${statusText})` : ''}`;
  let code: ApiErrorCode | undefined = undefined;
  let details: ValidationErrorDetail[] | undefined = undefined;

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) {
      message = obj.message.trim();
    }
    if (typeof obj.code === 'string' && API_ERROR_CODE_SET.has(obj.code)) {
      code = obj.code as ApiErrorCode;
    }
    if (Array.isArray(obj.details)) {
      const validDetails: ValidationErrorDetail[] = [];
      for (const item of obj.details) {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).field === 'string' &&
          typeof (item as Record<string, unknown>).issue === 'string' &&
          VALIDATION_ISSUE_SET.has((item as Record<string, unknown>).issue as string)
        ) {
          validDetails.push({
            field: String((item as Record<string, unknown>).field),
            issue: (item as Record<string, unknown>).issue as ValidationIssue,
            message: typeof (item as Record<string, unknown>).message === 'string'
              ? String((item as Record<string, unknown>).message)
              : undefined,
          });
        }
      }
      if (validDetails.length > 0) {
        details = validDetails;
      }
    }
  }

  return { message, code, details, rawBody: parsed ?? bodyText };
}

/**
 * 自定义 API 请求异常类
 * 封装 HTTP 状态码、业务错误码以及后端返回的错误明细
 */
export class ApiError extends Error {
  /** HTTP 响应状态码 */
  public readonly status: number;
  /** 业务错误码 */
  public readonly code?: ApiErrorCode;
  /** 字段级校验明细列表 */
  public readonly details?: ValidationErrorDetail[];
  /** 接口返回的原始数据 */
  public readonly rawBody?: unknown;

  constructor(
    message: string,
    status: number = 500,
    code?: ApiErrorCode,
    details?: ValidationErrorDetail[],
    rawBody?: unknown
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.rawBody = rawBody;

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
    const bodyText = await res.text().catch(() => '');
    const parsed = parseApiErrorBody(bodyText, res.status, res.statusText);
    throw new ApiError(parsed.message, res.status, parsed.code, parsed.details, parsed.rawBody);
  }

  return res.json() as Promise<T>;
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
