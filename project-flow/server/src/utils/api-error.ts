import { Response } from 'express';
import { ApiErrorCode, NotFoundErrorCode, ValidationErrorDetail, ApiErrorResponse } from '../../../shared/types';

/**
 * 统一构建标准 ApiErrorResponse 响应体对象
 */
export function buildApiError(
  code: ApiErrorCode,
  message: string,
  details?: ValidationErrorDetail[]
): ApiErrorResponse {
  const payload: ApiErrorResponse = { code, message };
  if (details && details.length > 0) {
    payload.details = details;
  }
  return payload;
}

/**
 * 统一发送 API 错误响应
 */
export function sendApiError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ValidationErrorDetail[]
): Response {
  return res.status(status).json(buildApiError(code, message, details));
}

/**
 * 400 参数校验失败快捷响应 (聚合字段明细)
 */
export function sendValidationError(
  res: Response,
  details: ValidationErrorDetail[],
  message = '请求参数校验失败'
): Response {
  return sendApiError(res, 400, 'VALIDATION_ERROR', message, details);
}

/**
 * 404 未找到资源快捷响应 (强类型限定为 NotFoundErrorCode)
 */
export function sendNotFoundError(
  res: Response,
  code: NotFoundErrorCode,
  message: string
): Response {
  return sendApiError(res, 404, code, message);
}

/**
 * 400 通用请求非法快捷响应
 */
export function sendBadRequestError(
  res: Response,
  code: ApiErrorCode,
  message: string
): Response {
  return sendApiError(res, 400, code, message);
}

/**
 * 业务应用异常类, 用于在业务逻辑中 throw 或传递给 next(err)
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

