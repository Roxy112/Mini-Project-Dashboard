import 'dotenv/config';
import { Pool, PoolConfig } from 'pg';

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
pool.on('connect', () => {
  console.log('PostgreSQL database pool connected successfully');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// 3. export pool (默认导出)
export default pool;
