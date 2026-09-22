import 'dotenv/config';

export interface DiscreteDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * 安全解析整数环境变量
 */
export function parseIntegerEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`配置错误: 环境变量 ${name} 必须为安全整数, 收到非法值 "${raw}"`);
  }
  return parsed;
}

/**
 * 获取离散的数据库连接配置对象 (无 URL 编码或转义失真)
 */
export function getDiscreteDatabaseConfig(): DiscreteDatabaseConfig {
  return {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.PGDATABASE || process.env.DB_NAME || 'project_flow',
  };
}

/**
 * 从环境变量安全构建符合 RFC / node-postgres 规范的 PostgreSQL 连接 URL
 * 专供 Prisma CLI 等需要 URL 字符串的工具链使用, 妥善处理 IPv6、Unix Domain Socket 与特殊字符
 */
export function buildDatabaseUrlFromEnv(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim();
  }

  const discrete = getDiscreteDatabaseConfig();
  const user = encodeURIComponent(discrete.user);
  const password = discrete.password ? encodeURIComponent(discrete.password) : '';
  const auth = password ? `${user}:${password}` : user;

  // 1. Unix domain socket: 以 / 开头的主机路径
  if (discrete.host.startsWith('/')) {
    return `postgresql://${auth}@/${encodeURIComponent(discrete.database)}?host=${encodeURIComponent(discrete.host)}`;
  }

  // 2. IPv6 主机: 若包含冒号且未被中括号包裹, 规范化为 [host]
  const formattedHost =
    discrete.host.includes(':') && !discrete.host.startsWith('[')
      ? `[${discrete.host}]`
      : discrete.host;

  // 3. 数据库名与端口合成
  return `postgresql://${auth}@${formattedHost}:${discrete.port}/${encodeURIComponent(discrete.database)}`;
}

