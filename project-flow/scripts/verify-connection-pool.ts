import http from 'node:http';
import { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  buildPoolConfig,
  createPool,
  validatePoolConfig,
  parseIntegerEnv,
  getDiscreteDatabaseConfig,
  buildDatabaseUrlFromEnv,
  MAX_TIMER_DELAY,
} from '../server/src/database/pool';
import { createDb } from '../server/src/prisma/db';
import { createApp } from '../server/src/app';
import { createShutdownController, validateShutdownTimeout } from '../server/src/shutdown';

console.log('=== 开始执行数据库连接池统一与优雅停机自动化测试 ===\n');

// -------------------------------------------------------------
// 测试套件 1: 连接池配置、环境变量校验与显式 undefined 边界测试
// -------------------------------------------------------------
console.log('▶ [套件 1] 运行配置边界、环境变量校验与测试隔离测试...');
{
  const originalEnv = { ...process.env };

  try {
    // 固定默认值测试环境, 避免外部连接池配置影响断言; 空字符串按未配置处理
    process.env.PG_CONNECTION_TIMEOUT_MS = '';
    process.env.PG_IDLE_TIMEOUT_MS = '';
    process.env.PG_MAX_CONNECTIONS = '';

    // 1. 环境变量有效性解析测试
    process.env['TEST_SAFE_INT'] = '123';
    assert.equal(parseIntegerEnv('TEST_SAFE_INT', 10), 123);

    process.env['TEST_SAFE_INT'] = '   ';
    assert.equal(parseIntegerEnv('TEST_SAFE_INT', 10), 10);

    process.env['TEST_SAFE_INT'] = 'not-a-number';
    assert.throws(
      () => parseIntegerEnv('TEST_SAFE_INT', 10),
      /配置错误: 环境变量 TEST_SAFE_INT 必须为安全整数/
    );

    // 2. 合并配置边界校验测试 (非法负数/零/超上限)
    assert.throws(
      () => validatePoolConfig({ max: 0 }),
      /配置错误: 连接池容量 max 必须为有限正整数/
    );
    assert.throws(
      () => validatePoolConfig({ max: -5 }),
      /配置错误: 连接池容量 max 必须为有限正整数/
    );
    assert.throws(
      () => validatePoolConfig({ connectionTimeoutMillis: 0 }),
      /配置错误: 连接获取超时 connectionTimeoutMillis 必须在 1 到/
    );
    assert.throws(
      () => validatePoolConfig({ connectionTimeoutMillis: MAX_TIMER_DELAY + 1 }),
      /配置错误: 连接获取超时 connectionTimeoutMillis 必须在 1 到/
    );
    assert.throws(
      () => validatePoolConfig({ idleTimeoutMillis: -1 }),
      /配置错误: 空闲超时 idleTimeoutMillis 必须在 0 到/
    );
    assert.throws(
      () => validatePoolConfig({ idleTimeoutMillis: MAX_TIMER_DELAY + 1 }),
      /配置错误: 空闲超时 idleTimeoutMillis 必须在 0 到/
    );

    // 3. 停机超时参数校验测试
    assert.equal(validateShutdownTimeout(undefined), 10000);
    assert.equal(validateShutdownTimeout(5000), 5000);
    assert.throws(
      () => validateShutdownTimeout(0),
      /配置错误: 停机超时 timeoutMs 必须在 1 到/
    );

    // 4. 显式 undefined 过滤测试 (必须保留默认超时, 不得被覆盖为 undefined)
    const undefinedConfig = buildPoolConfig({
      connectionTimeoutMillis: undefined,
      idleTimeoutMillis: undefined,
      max: undefined,
    });
    assert.equal(undefinedConfig.connectionTimeoutMillis, 20000, '显式 undefined 必须保留默认连接获取超时 20000ms');
    assert.equal(undefinedConfig.idleTimeoutMillis, 30000, '显式 undefined 必须保留默认空闲超时 30000ms');
    assert.equal(undefinedConfig.max, 10, '显式 undefined 必须保留默认容量 10');

    // 5. 显式 undefined 必须保留环境变量配置, 不得回退到默认值
    process.env.PG_CONNECTION_TIMEOUT_MS = '1200';
    process.env.PG_IDLE_TIMEOUT_MS = '5000';
    process.env.PG_MAX_CONNECTIONS = '5';

    const envConfig = buildPoolConfig({
      connectionTimeoutMillis: undefined,
      idleTimeoutMillis: undefined,
      max: undefined,
    });
    assert.equal(envConfig.connectionTimeoutMillis, 1200, '显式 undefined 必须保留环境变量配置的连接获取超时');
    assert.equal(envConfig.idleTimeoutMillis, 5000, '显式 undefined 必须保留环境变量配置的空闲超时');
    assert.equal(envConfig.max, 5, '显式 undefined 必须保留环境变量配置的连接池容量');

    // 6. idleTimeoutMillis: 0 合法假值保留测试 (代表禁用空闲连接自动回收)
    const zeroIdleConfig = buildPoolConfig({ idleTimeoutMillis: 0 });
    assert.equal(zeroIdleConfig.idleTimeoutMillis, 0, 'idleTimeoutMillis: 0 必须被完整保留, 不得被覆盖为默认值');

    // 7. 测试连接目标隔离合并测试 (传入独立目标时清除继承的 DATABASE_URL)
    process.env['DATABASE_URL'] = 'postgres://prod_user:pass@prod-host:5432/prod_db';
    const isolatedConfig = buildPoolConfig({ database: 'isolated_test_db' });
    assert.equal(isolatedConfig.database, 'isolated_test_db');
    assert.equal(isolatedConfig.connectionString, undefined, '自定义连接目标时必须移除继承的 connectionString 以保证测试隔离');

    // 8. 密码覆盖与动态密码回调优先级测试 (P2 修复验证)
    const passConfig = buildPoolConfig({ password: 'override_secret' });
    assert.equal(passConfig.password, 'override_secret', '传入显式密码时必须生效');
    assert.equal(passConfig.connectionString, undefined, '传入显式密码时不得继承默认 connectionString, 防止被 URL 密码覆盖');

    const callbackFn = () => Promise.resolve('dynamic_secret');
    const callbackConfig = buildPoolConfig({ password: callbackFn });
    assert.equal(typeof callbackConfig.password, 'function', '传入动态密码回调函数时必须保留为 function 类型');
    assert.equal(callbackConfig.connectionString, undefined, '传入密码回调函数时不得继承默认 connectionString');

    // 9. IPv6 主机 URL 合成与 Client 回读测试 (P1 修复验证)
    delete process.env['DATABASE_URL'];
    process.env.PGHOST = '::1';
    process.env.PGPORT = '5432';
    process.env.PGUSER = 'test_user';
    process.env.PGPASSWORD = 'test_password';
    process.env.PGDATABASE = 'test_db';

    const ipv6Url = buildDatabaseUrlFromEnv();
    assert.ok(ipv6Url.includes('@[::1]:5432'), `IPv6 地址必须被中括号包裹: ${ipv6Url}`);
    const ipv6Client = new Client({ connectionString: ipv6Url });
    assert.equal((ipv6Client as any).connectionParameters.host, '[::1]', 'pg Client 必须正确解析 IPv6 格式的主机');

    // 10. Unix Domain Socket 主机 URL 合成与 Client 回读测试 (P1 修复验证)
    process.env.PGHOST = '/var/run/postgresql';
    const socketUrl = buildDatabaseUrlFromEnv();
    assert.ok(socketUrl.includes('?host=%2Fvar%2Frun%2Fpostgresql'), `Unix socket 必须通过 query 参数传递: ${socketUrl}`);
    const socketClient = new Client({ connectionString: socketUrl });
    assert.equal((socketClient as any).connectionParameters.host, '/var/run/postgresql', 'pg Client 必须正确解析 socket 路径');

    // 11. 密码含特殊字符与离散配置保真度测试 (P1 修复验证)
    process.env.PGHOST = 'localhost';
    process.env.PGPASSWORD = 'p@ss:word/123#?&';
    process.env.PGDATABASE = 'project#flow';

    const specialUrl = buildDatabaseUrlFromEnv();
    const specialClient = new Client({ connectionString: specialUrl });
    assert.equal(
      (specialClient as any).connectionParameters.password,
      'p@ss:word/123#?&',
      '特殊字符密码在 URL 编解码后必须无损还原'
    );

    // 验证离散原生对象直传不会发生 URL 截断 (例如 project#flow 依然完整)
    const discrete = getDiscreteDatabaseConfig();
    assert.equal(discrete.database, 'project#flow', '离散对象必须原生保留数据库名中的特殊字符');
    const discretePoolConfig = buildPoolConfig();
    assert.equal(discretePoolConfig.database, 'project#flow', '未设置 DATABASE_URL 时 PoolConfig 必须直传离散数据库名');
  } finally {
    process.env = originalEnv;
  }
}
console.log('✔ [套件 1] 配置边界、环境变量校验与测试隔离测试通过\n');

// -------------------------------------------------------------
// 测试套件 2: 真实 Prisma 查询注入与外部池归属验证
// -------------------------------------------------------------
console.log('▶ [套件 2] 运行真实 Prisma 查询与连接池所有权验证测试...');
{
  const testPoolErrors: Error[] = [];
  const testPool = createPool({
    onError: (err) => {
      testPoolErrors.push(err);
    },
  });
  const testDb = createDb(testPool);

  try {
    const beforeCount = testPool.totalCount;
    // 执行真实 Prisma ORM 查询
    const projects = await testDb.orm.public.Project.select('id', 'name').all();
    assert.ok(Array.isArray(projects), 'Prisma 查询必须成功返回数组');
    assert.ok(testPool.totalCount >= 1, `Prisma ORM 查询必须使用注入的 Pool (before: ${beforeCount}, after: ${testPool.totalCount})`);

    // 关闭 Prisma 客户端
    await testDb.close();

    // 验证 db.close() 后底层 Pool 依然可用 (证明外部调用者拥有 Pool 所有权)
    const poolQueryResult = await testPool.query('SELECT 1 as num;');
    assert.equal(poolQueryResult.rows[0].num, 1, 'Prisma db.close() 后外部 Pool 必须仍能正常执行查询');

    assert.equal(testPoolErrors.length, 0, '测试运行过程中连接池不应抛出未捕获错误');
  } finally {
    try {
      await testDb.close();
    } catch {
      // 忽略重复关闭
    } finally {
      await testPool.end();
    }
  }
}
console.log('✔ [套件 2] 真实 Prisma 查询与连接池所有权验证测试通过\n');

// -------------------------------------------------------------
// 测试套件 3: 连接池占满与连接获取超时约束测试
// -------------------------------------------------------------
console.log('▶ [套件 3] 运行连接池占满与连接获取超时测试...');
{
  const timeoutPoolErrors: Error[] = [];
  const timeoutPool = createPool({
    config: {
      max: 1,
      connectionTimeoutMillis: 400,
    },
    onError: (err) => {
      timeoutPoolErrors.push(err);
    },
  });
  const timeoutDb = createDb(timeoutPool);

  const testDeadline = Date.now() + 6000;

  // 检出唯一的连接, 使连接池处于 100% 耗尽状态
  const occupiedClient = await timeoutPool.connect();

  try {
    // 1. 验证健康检查在连接池耗尽时超时失败
    const startHealth = Date.now();
    let healthError: Error | null = null;
    try {
      await timeoutPool.query('SELECT 1;');
    } catch (e) {
      healthError = e as Error;
    }
    const healthDuration = Date.now() - startHealth;
    assert.ok(healthError !== null, '连接池耗尽时健康检查必须抛出超时错误');
    assert.match(healthError.message, /timeout exceeded when trying to connect/i);
    assert.ok(
      healthDuration >= 350 && healthDuration <= 3000,
      `健康检查耗时必须接近超时配置 (实测: ${healthDuration}ms)`
    );

    // 2. 验证业务 ORM 查询在同一连接池耗尽时同样超时失败
    const startPrisma = Date.now();
    let prismaError: Error | null = null;
    try {
      await timeoutDb.orm.public.Project.select('id').all();
    } catch (e) {
      prismaError = e as Error;
    }
    const prismaDuration = Date.now() - startPrisma;
    assert.ok(prismaError !== null, '连接池耗尽时 Prisma 查询必须抛出超时错误');
    assert.ok(
      prismaDuration >= 350 && prismaDuration <= 3000,
      `Prisma 查询耗时必须接近超时配置 (实测: ${prismaDuration}ms)`
    );

    assert.ok(Date.now() < testDeadline, '测试必须在总截止时间内完成, 防止流程挂起');
  } finally {
    // 关键保障: finally 中必须释放 client, 即使断言失败也能正确排干连接池
    occupiedClient.release();
    try {
      await timeoutDb.close();
    } catch {
      // 忽略已关闭错误
    } finally {
      await timeoutPool.end();
    }
  }

  assert.equal(timeoutPoolErrors.length, 0, '超时测试期间连接池不应抛出非预期的空闲异常');
}
console.log('✔ [套件 3] 连接池占满与连接获取超时测试通过\n');

// -------------------------------------------------------------
// 测试套件 4: 在途 HTTP 请求处理完成与停机顺序测试
// -------------------------------------------------------------
console.log('▶ [套件 4] 运行在途 HTTP 请求完成与停机顺序测试...');
{
  let requestEntered = false;
  let responseFinished = false;
  let dbClosed = false;
  let poolClosed = false;

  const server = http.createServer(async (req, res) => {
    if (req.url === '/test-slow') {
      requestEntered = true;
      // 模拟 80ms 的在途处理业务
      await new Promise((resolve) => setTimeout(resolve, 80));
      responseFinished = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;

  const mockDb = {
    close: async () => {
      assert.ok(responseFinished, 'db.close 必须在在途 HTTP 请求处理完成返回之后才触发');
      dbClosed = true;
    },
  };
  const mockPool = {
    end: async () => {
      assert.ok(dbClosed, 'pool.end 必须在 db.close 执行完成后才触发');
      poolClosed = true;
    },
  };

  const controller = createShutdownController({
    server,
    db: mockDb,
    pool: mockPool,
    timeoutMs: 5000,
  });

  // 客户端发起请求
  const reqPromise = fetch(`http://localhost:${port}/test-slow`);

  // 等待服务端确认请求已真正进入处理阶段 (最多等待 3000ms 截止期)
  const enterDeadline = Date.now() + 3000;
  while (!requestEntered) {
    if (Date.now() > enterDeadline) {
      throw new Error('等待在途请求进入服务端超时 (3000ms)');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  // 确认请求已进入, 触发优雅停机
  const shutdownPromise = controller.shutdown('TEST_IN_FLIGHT_REQUEST', 0);

  // 验证在途请求成功获得 200 响应
  const res = await reqPromise;
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { status: 'success' });

  // 等待停机流程完整结束
  const exitCode = await shutdownPromise;
  assert.equal(exitCode, 0, '在途请求正常处理后停机应返回 0');
  assert.ok(dbClosed, 'db.close 必须已执行');
  assert.ok(poolClosed, 'pool.end 必须已执行');
}
console.log('✔ [套件 4] 在途 HTTP 请求完成与停机顺序测试通过\n');

// -------------------------------------------------------------
// 测试套件 5: 停机状态单向升级、硬超时与单次 finish 防重入测试
// -------------------------------------------------------------
console.log('▶ [套件 5] 运行退出状态单向升级、硬超时维持循环与单次 finish 测试...');
{
  // 1. 正常停机中途发生致命错误 (退出码升级为 1)
  {
    let recordedExitCode: number | null = null;
    let finishCallsCount = 0;

    const delayedServer = {
      close: (cb: (err?: Error) => void) => {
        // 模拟 server.close 处理中, 触发了致命错误
        setTimeout(() => {
          controller.shutdown('Fatal Database Error', 1);
          cb();
        }, 30);
      },
    };

    const controller = createShutdownController({
      server: delayedServer,
      db: { close: async () => {} },
      pool: { end: async () => {} },
      exitProcess: (code) => {
        recordedExitCode = code;
        finishCallsCount++;
      },
      timeoutMs: 5000,
    });

    const finalCode = await controller.shutdown('SIGINT', 0);
    assert.equal(finalCode, 1, '正常停机过程中收到致命错误必须将退出状态单向升级为 1');
    assert.equal(recordedExitCode, 1);
    assert.equal(finishCallsCount, 1, 'exitProcess 只能被通知一次');
  }

  // 2. 硬超时维持事件循环与迟到清理不重入测试 (不调用 .unref())
  {
    let recordedExitCode: number | null = null;
    let finishCallsCount = 0;
    let lateCleanupRan = false;

    let hangingCallback: ((err?: Error) => void) | null = null;
    const hangingServer = {
      close: (cb: (err?: Error) => void) => {
        hangingCallback = cb;
      },
    };

    const controller = createShutdownController({
      server: hangingServer,
      db: {
        close: async () => {
          lateCleanupRan = true;
        },
      },
      pool: { end: async () => {} },
      exitProcess: (code) => {
        recordedExitCode = code;
        finishCallsCount++;
      },
      timeoutMs: 60, // 60ms 快速超时测试
    });

    const finalCode = await controller.shutdown('TEST_HANGING_TIMEOUT', 0);
    assert.equal(finalCode, 1, '超时必须解析为退出码 1');
    assert.equal(recordedExitCode, 1);
    assert.equal(finishCallsCount, 1, '超时触发 exitProcess 一次');

    // 模拟迟到的 server.close 回调完成
    if (hangingCallback) {
      (hangingCallback as (err?: Error) => void)();
    }
    // 等待微任务队列执行迟到回调内部的 db.close
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.ok(lateCleanupRan, '超时后迟到的清理继续执行以尝试释放底层资源');
    assert.equal(finishCallsCount, 1, '迟到回调不得重复触发 exitProcess');
  }

  // 3. 关闭连接池异常时退出码提升为 1
  {
    let recordedExitCode: number | null = null;
    const normalServer = {
      close: (cb: (err?: Error) => void) => cb(),
    };

    const controller = createShutdownController({
      server: normalServer,
      db: { close: async () => {} },
      pool: {
        end: async () => {
          throw new Error('Simulated pool.end error');
        },
      },
      exitProcess: (code) => {
        recordedExitCode = code;
      },
      timeoutMs: 5000,
    });

    const finalCode = await controller.shutdown('TEST_POOL_ERROR', 0);
    assert.equal(finalCode, 1, '连接池释放抛错时最终退出码必须为 1');
    assert.equal(recordedExitCode, 1);
  }
}
console.log('✔ [套件 5] 退出状态单向升级、硬超时维持循环与单次 finish 测试通过\n');

// -------------------------------------------------------------
// 测试套件 6: Prisma CLI 配置隔离与无副作用加载测试 (P2 修复验证)
// -------------------------------------------------------------
console.log('▶ [套件 6] 运行 Prisma CLI 配置隔离与无副作用加载测试...');
{
  const originalEnv = { ...process.env };
  try {
    // 设置非法的连接池环境变量, 此前导入 pool.ts 会在此处直接抛错
    process.env.PG_MAX_CONNECTIONS = 'invalid-integer';
    process.env.PGHOST = '127.0.0.1';
    process.env.PGPORT = '5432';
    process.env.PGUSER = 'cli_user';
    process.env.PGDATABASE = 'cli_db';
    delete process.env.DATABASE_URL;
    delete process.env.PGPASSWORD;
    delete process.env.DB_PASSWORD;

    // 验证 connection-config 模块在非法连接池配置下依然能安全运行并输出合法 URL
    const cliUrl = buildDatabaseUrlFromEnv();
    assert.equal(
      cliUrl,
      'postgresql://cli_user@127.0.0.1:5432/cli_db',
      'Prisma CLI 连接字符串在非法连接池配置下应无副作用正常合成'
    );
  } finally {
    process.env = originalEnv;
  }
}
console.log('✔ [套件 6] Prisma CLI 配置隔离与无副作用加载测试通过\n');

// -------------------------------------------------------------
// 测试套件 7: 真实 HTTP 健康检查全生命周期与边界验收 (P2 修复验证)
// -------------------------------------------------------------
console.log('▶ [套件 7] 运行真实 HTTP 健康检查全生命周期与边界验收测试...');
{
  const healthPool = createPool();
  const healthDb = createDb(healthPool);

  const mockRepos = {
    projects: {
      getAll: async () => [],
      create: async () => ({ id: 1, name: 'test' }),
      delete: async () => true,
    },
    tasks: {
      getAll: async () => [],
      create: async () => ({} as any),
      update: async () => null,
      delete: async () => true,
    },
  };

  // 1. 真实运行期探活 (探针: db.orm.public.Project.select('id').first())
  const app = createApp({
    repos: mockRepos,
    healthCheck: async () => {
      // 验证共享 Prisma 客户端及最小业务表读取路径可用
      await healthDb.orm.public.Project.select('id').first();
    },
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const healthUrl = `http://localhost:${port}/api/health`;

  try {
    // 验收 1: 正常状态下 /api/health 返回 200 OK
    const resNormal = await fetch(healthUrl);
    assert.equal(resNormal.status, 200, '正常运行期健康检查必须返回 200');
    const dataNormal = (await resNormal.json()) as any;
    assert.equal(dataNormal.status, 'ok');
    assert.equal(dataNormal.database, 'connected');

    // 验收 2: 空表结果容忍测试 (first() 返回 null 时代表表为空, 探活依然视为健康)
    let probeExecuted = false;
    const emptyTableApp = createApp({
      repos: mockRepos,
      healthCheck: async () => {
        probeExecuted = true;
        // 模拟 Project.select('id').first() 在空表时返回 null
        const result: { id: number } | null = null;
        return result;
      },
    });
    const emptyServer = http.createServer(emptyTableApp);
    await new Promise<void>((resolve) => emptyServer.listen(0, resolve));
    const emptyPort = (emptyServer.address() as AddressInfo).port;
    try {
      const resEmpty = await fetch(`http://localhost:${emptyPort}/api/health`);
      assert.equal(resEmpty.status, 200, '探针返回 null 时健康检查依然判定为正常 200');
      assert.ok(probeExecuted, '探针函数必须被实际调用执行');
    } finally {
      await new Promise<void>((resolve) => emptyServer.close(() => resolve()));
    }

    // 验收 3: Prisma 客户端关闭后, 健康检查真实感知并返回 503 SERVICE_UNAVAILABLE (杜绝假阳性)
    await healthDb.close();

    // 此时底层连接池如果执行 SELECT 1 依然会返回成功 (假阳性)
    const rawPoolCheck = await healthPool.query('SELECT 1 as num;');
    assert.equal(rawPoolCheck.rows[0].num, 1, '旧底层连接池在 Prisma 关闭后仍会虚假存活');

    // 但基于 Prisma 探针的 /api/health 必须真实返回 503 且报 SERVICE_UNAVAILABLE
    const resClosed = await fetch(healthUrl);
    assert.equal(resClosed.status, 503, 'Prisma 客户端关闭后健康检查必须返回 503');
    const dataClosed = (await resClosed.json()) as any;
    assert.equal(dataClosed.code, 'SERVICE_UNAVAILABLE');
    assert.equal(dataClosed.message, '数据库服务暂不可用');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      await healthDb.close();
    } catch {
      // 忽略重复关闭
    } finally {
      await healthPool.end();
    }
  }
}
console.log('✔ [套件 7] 真实 HTTP 健康检查全生命周期与边界验收测试通过\n');

console.log('====================================================');
console.log('🎉 所有数据库连接池与优雅停机自动化测试全部通过!');
console.log('====================================================\n');
