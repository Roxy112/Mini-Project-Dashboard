import 'dotenv/config';
import { Pool, PoolConfig, types } from 'pg';
import {
  parseIntegerEnv,
  getDiscreteDatabaseConfig,
  buildDatabaseUrlFromEnv,
} from './connection-config';

export { parseIntegerEnv, getDiscreteDatabaseConfig, buildDatabaseUrlFromEnv };

// 强制将 PostgreSQL DATE 类型 (OID 1082) 解析为 YYYY-MM-DD 原始字符串, 杜绝时区转换漂移
types.setTypeParser(1082, (val: string) => val);

// 1. 常量与环境变量解析辅助函数
export const MAX_TIMER_DELAY = 2147483647;

/**
 * 校验合并后的完整连接池配置 (支持 32 位定时器上限与非负/正整数约束)
 */
export function validatePoolConfig(config: PoolConfig): PoolConfig {
  const max = config.max;
  if (max !== undefined && max !== null) {
    if (!Number.isSafeInteger(max) || max < 1) {
      throw new Error(`配置错误: 连接池容量 max 必须为有限正整数 (>= 1), 收到非法值 ${max}`);
    }
  }

  const connectionTimeout = config.connectionTimeoutMillis;
  if (connectionTimeout !== undefined && connectionTimeout !== null) {
    if (!Number.isSafeInteger(connectionTimeout) || connectionTimeout < 1 || connectionTimeout > MAX_TIMER_DELAY) {
      throw new Error(
        `配置错误: 连接获取超时 connectionTimeoutMillis 必须在 1 到 ${MAX_TIMER_DELAY} 毫秒之间, 收到非法值 ${connectionTimeout}`
      );
    }
  }

  const idleTimeout = config.idleTimeoutMillis;
  if (idleTimeout !== undefined && idleTimeout !== null) {
    if (!Number.isSafeInteger(idleTimeout) || idleTimeout < 0 || idleTimeout > MAX_TIMER_DELAY) {
      throw new Error(
        `配置错误: 空闲超时 idleTimeoutMillis 必须在 0 到 ${MAX_TIMER_DELAY} 毫秒之间 (0 表示禁用空闲回收), 收到非法值 ${idleTimeout}`
      );
    }
  }

  return config;
}

/**
 * 构建连接池基础配置 (明确超时与容量配置, 杜绝静默回退并支持测试连接目标隔离)
 */
export function buildPoolConfig(customConfig?: PoolConfig): PoolConfig {
  const baseDefaults: PoolConfig = {
    connectionTimeoutMillis: parseIntegerEnv('PG_CONNECTION_TIMEOUT_MS', 20000),
    idleTimeoutMillis: parseIntegerEnv('PG_IDLE_TIMEOUT_MS', 30000),
    max: parseIntegerEnv('PG_MAX_CONNECTIONS', 10),
  };

  // 过滤显式传入的 undefined 字段, 避免冲掉默认超时配置 (保留 0 等合法假值)
  const overrides = Object.fromEntries(
    Object.entries(customConfig ?? {}).filter(([, value]) => value !== undefined)
  ) as PoolConfig;

  // 检查是否自定义了连接目标 (如 database, host, user, password, connectionString 等)
  const hasCustomTarget = Boolean(
    overrides.connectionString ||
    overrides.database ||
    overrides.host ||
    overrides.user ||
    overrides.password !== undefined ||
    overrides.port
  );

  // 若传入了独立连接目标且未提供 connectionString, 则不继承默认 DATABASE_URL, 保证测试隔离
  const baseConnection = hasCustomTarget
    ? {}
    : (process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : getDiscreteDatabaseConfig());

  const merged: PoolConfig = {
    ...baseDefaults,
    ...baseConnection,
    ...overrides,
  };

  // 统一对最终合并后的配置进行合法性校验, 防止非法参数绕过校验
  return validatePoolConfig(merged);
}

let fatalErrorHandler: ((err: Error) => void) | null = null;

export function registerFatalErrorHandler(handler: (err: Error) => void): void {
  fatalErrorHandler = handler;
}

export interface CreatePoolOptions {
  config?: PoolConfig;
  onError?: (err: Error) => void;
}

/**
 * 创建 Pool 实例工厂函数 (统一会话初始化与错误监听注入)
 */
export function createPool(options?: CreatePoolOptions): Pool {
  const poolConfig = buildPoolConfig(options?.config);
  const newPool = new Pool(poolConfig);

  // 1. 统一尝试设置会话 DateStyle 为 ISO (尽力尝试, 失败仅记录日志)
  newPool.on('connect', (client) => {
    client.query("SET DateStyle = 'ISO';").catch((err: Error) => {
      console.error('设置 DateStyle 失败:', err);
    });
  });

  // 2. 统一空闲连接错误监听 (通过参数注入处理函数, 杜绝无监听导致进程崩溃)
  newPool.on('error', (err: Error) => {
    if (options?.onError) {
      options.onError(err);
    } else if (fatalErrorHandler) {
      fatalErrorHandler(err);
    } else {
      console.error('Unexpected error on idle PostgreSQL client:', err);
      process.exit(1);
    }
  });

  return newPool;
}

// 2. 创建默认 Pool 单例
export const pool = createPool();

// 3. export pool (默认导出)
export default pool;
