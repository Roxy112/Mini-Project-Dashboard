import 'dotenv/config';
import { Pool, PoolConfig, types } from 'pg';

// 强制将 PostgreSQL DATE 类型 (OID 1082) 解析为 YYYY-MM-DD 原始字符串，杜绝时区转换漂移
types.setTypeParser(1082, (val: string) => val);

// 1. 读取 environment variables 并构建连接配置
const poolConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.PGDATABASE || process.env.DB_NAME || 'project_flow',
    };

// 2. 创建 Pool 实例
export const pool = new Pool(poolConfig);

// 监听连接池事件（日志与异常捕获）
pool.on('connect', (client) => {
  console.log('PostgreSQL database pool connected successfully');
  // 显式锁定当前 Session 的 DateStyle 为 ISO，确保输出格式统一为 YYYY-MM-DD
  client.query("SET DateStyle = 'ISO';").catch((err: Error) => {
    console.error('设置 DateStyle 失败:', err);
  });
});

let fatalErrorHandler: ((err: Error) => void) | null = null;

export function registerFatalErrorHandler(handler: (err: Error) => void): void {
  fatalErrorHandler = handler;
}

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  if (fatalErrorHandler) {
    fatalErrorHandler(err);
  } else {
    process.exit(1);
  }
});

// 3. export pool (默认导出)
export default pool;
