export interface ShutdownDependencies {
  server: { close: (cb: (err?: Error) => void) => void };
  db: { close: () => Promise<void> };
  pool: { end: () => Promise<void> };
  exitProcess?: (code: number) => void;
  timeoutMs?: number;
}

export const MAX_TIMEOUT_MS = 2147483647;

/**
 * 校验停机超时参数
 */
export function validateShutdownTimeout(timeoutMs?: number): number {
  if (timeoutMs === undefined) {
    return 10000;
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`配置错误: 停机超时 timeoutMs 必须在 1 到 ${MAX_TIMEOUT_MS} 毫秒之间, 收到非法值 ${timeoutMs}`);
  }
  return timeoutMs;
}

/**
 * 优雅停机控制器工厂 (具备退出状态单向升级, 超时保护, 单次收敛 finish 与非零退出码保护)
 */
export function createShutdownController(deps: ShutdownDependencies) {
  const timeoutMs = validateShutdownTimeout(deps.timeoutMs);
  let isShuttingDown = false;
  let globalExitCode = 0;
  let shutdownPromise: Promise<number> | null = null;

  const shutdown = (reason: string, exitCode = 0): Promise<number> => {
    // 无论是否已经在停机中, 只要收到非零退出请求, 立即将最终退出状态单向升级为失败 (不可逆降级)
    if (exitCode !== 0) {
      globalExitCode = exitCode;
    }

    if (isShuttingDown) {
      console.warn(`[Shutdown] 服务已在停机中, 收到新的停机请求 (原因: ${reason}, exitCode: ${exitCode}), 已合并退出状态为 ${globalExitCode}`);
      return shutdownPromise!;
    }
    isShuttingDown = true;
    console.log(`\n[Shutdown] 正在优雅关闭服务 (原因: ${reason})...`);

    shutdownPromise = new Promise<number>((resolve) => {
      let hasFinished = false;
      let forceExitTimer: NodeJS.Timeout | null = null;

      // 统一且幂等的完成收敛函数:
      // 超时后允许迟到的清理继续执行以尽量释放底层资源, 但不得重复通知退出或改变已完成的 Promise 结果
      const finish = (finalCode: number) => {
        if (hasFinished) {
          return;
        }
        hasFinished = true;
        if (forceExitTimer !== null) {
          clearTimeout(forceExitTimer);
          forceExitTimer = null;
        }
        if (deps.exitProcess) {
          deps.exitProcess(finalCode);
        }
        resolve(finalCode);
      };

      // 停机期间保持计时器引用以维持事件循环, 直至正常结束或超时触发
      forceExitTimer = setTimeout(() => {
        console.error(`[Shutdown] 优雅停机超时 (${timeoutMs / 1000}s), 强制结束流程`);
        globalExitCode = 1;
        finish(1);
      }, timeoutMs);

      deps.server.close(async (serverErr) => {
        if (serverErr) {
          console.error('[Shutdown] 关闭 HTTP 服务异常:', serverErr);
          globalExitCode = 1;
        } else {
          console.log('[Shutdown] HTTP 服务器已停止接收新连接');
        }

        try {
          // 1. 先关闭 Prisma 客户端: 标记客户端为已关闭, 拒绝后续 ORM 查询调用并等待后台初始化完成
          await deps.db.close();
          console.log('[Shutdown] Prisma ORM 客户端已安全关闭');
        } catch (prismaErr) {
          console.error('[Shutdown] 关闭 Prisma ORM 异常:', prismaErr);
          globalExitCode = 1;
        }

        try {
          // 2. 再关闭底层唯一的 PostgreSQL 共享连接池: 等待检出客户端归还并断开物理网络连接
          await deps.pool.end();
          console.log('[Shutdown] PostgreSQL 连接池已安全释放');
        } catch (poolErr) {
          console.error('[Shutdown] 关闭数据库连接池异常:', poolErr);
          globalExitCode = 1;
        } finally {
          finish(globalExitCode);
        }
      });
    });

    return shutdownPromise;
  };

  return {
    shutdown,
    get isShuttingDown() {
      return isShuttingDown;
    },
    get exitCode() {
      return globalExitCode;
    },
  };
}
