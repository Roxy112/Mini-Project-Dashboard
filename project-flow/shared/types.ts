/** 前后端共享的核心实体与优先级类型 */
export type Priority = 'low' | 'medium' | 'high';

export interface Project {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  text: string;
  done: boolean;
  projectId: number;
  priority: Priority;
  dueDate?: string | null;
  description?: string | null;
}

/** 字段级校验失败原因单一数据源 */
export const VALIDATION_ISSUES = [
  'REQUIRED',
  'INVALID_TYPE',
  'INVALID_VALUE',
  'TOO_LONG',
  'PAST_DATE',
] as const;

export type ValidationIssue = (typeof VALIDATION_ISSUES)[number];
export const VALIDATION_ISSUE_SET: ReadonlySet<string> = new Set(VALIDATION_ISSUES);

/** 404 专用的未找到错误码集合 */
export const NOT_FOUND_ERROR_CODES = [
  'PROJECT_NOT_FOUND',
  'TASK_NOT_FOUND',
  'ROUTE_NOT_FOUND',
] as const;

export type NotFoundErrorCode = (typeof NOT_FOUND_ERROR_CODES)[number];

/** 系统全体合法错误码单一数据源 */
export const VALID_API_ERROR_CODES = [
  // 1. 协议与解析层错误
  'BAD_REQUEST',
  'INVALID_JSON',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'VALIDATION_ERROR',
  'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE',

  // 2. 路由与资源不存在 (404)
  ...NOT_FOUND_ERROR_CODES,

  // 3. 路径/查询参数 ID 格式错误
  'INVALID_PROJECT_ID',
  'INVALID_TASK_ID',

  // 4. 业务约束
  'NO_TASK_UPDATES',
] as const;

export type ApiErrorCode = (typeof VALID_API_ERROR_CODES)[number];
export const API_ERROR_CODE_SET: ReadonlySet<string> = new Set(VALID_API_ERROR_CODES);

export interface ValidationErrorDetail {
  field: string;
  issue: ValidationIssue;
  message?: string;
}

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  details?: ValidationErrorDetail[];
}
