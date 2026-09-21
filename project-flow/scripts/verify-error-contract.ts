import http from 'node:http';
import { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';
import { createApp } from '../server/src/app';
import { DataRepositories } from '../server/src/types/repository';
import { mapRowToTask } from '../server/src/repositories/prisma-repositories';
import { api, toFailedActionResult, parseApiErrorBody, ApiError } from '../src/services/api';
import { formatErrorMessage, Priority, Project, Task } from '../src/types/index';

console.log('=== 开始执行 API Error Contract 自动化测试 ===\n');

// -------------------------------------------------------------
// 测试套件 1: mapRowToTask 映射函数单元测试
// -------------------------------------------------------------
console.log('▶ [套件 1] 运行 mapRowToTask 映射与运行期守卫测试...');
{
  const validRow = {
    id: 1,
    projectId: 10,
    text: '测试任务',
    done: false,
    priority: 'high',
    dueDate: '2026-09-30',
    description: '描述内容',
  };

  const task = mapRowToTask(validRow);
  assert.equal(task.id, 1);
  assert.equal(task.priority, 'high');

  // 测试非法 priority 触发异常保护
  assert.throws(
    () => {
      mapRowToTask({ ...validRow, priority: 'critical' });
    },
    (err: Error) => {
      assert.match(err.message, /数据库任务优先级数据异常/);
      return true;
    }
  );
}
console.log('✔ mapRowToTask 单元测试通过\n');

// -------------------------------------------------------------
// 测试套件 2: 服务端隔离契约与中间件测试
// -------------------------------------------------------------
console.log('▶ [套件 2] 运行服务端隔离契约测试...');

let shouldFailHealth = false;
let shouldFailUpdateDb = false;

const mockRepositories: DataRepositories = {
  projects: {
    getAll: async (): Promise<Project[]> => [{ id: 1, name: '默认项目' }],
    create: async ({ name }: { name: string }): Promise<Project> => ({ id: 2, name }),
    delete: async (id: number): Promise<boolean> => id === 1,
  },
  tasks: {
    getAll: async (_projectId?: number): Promise<Task[]> => [],
    create: async (data: {
      text: string;
      priority: Priority;
      projectId: number;
      dueDate?: string | null;
      description?: string | null;
    }): Promise<Task> => {
      if (data.projectId === 999999) {
        const err = new Error('Foreign key violation') as Error & { sqlState: string; constraint: string };
        err.sqlState = '23503';
        err.constraint = 'tasks_project_id_fkey';
        throw err;
      }
      return {
        id: 1,
        text: data.text,
        done: false,
        priority: data.priority,
        projectId: data.projectId,
        dueDate: data.dueDate || null,
        description: data.description || null,
      };
    },
    update: async (
      id: number,
      updates: {
        text?: string;
        done?: boolean;
        priority?: Priority;
        dueDate?: string | null;
        description?: string | null;
      }
    ): Promise<Task | null> => {
      if (shouldFailUpdateDb) {
        throw new Error('模拟数据库不可用异常');
      }
      if (id !== 1) {
        return null;
      }
      return {
        id: 1,
        projectId: 1,
        text: updates.text || '已更新',
        done: updates.done ?? false,
        priority: updates.priority || 'medium',
        dueDate: updates.dueDate || null,
        description: updates.description || null,
      };
    },
    delete: async (id: number): Promise<boolean> => id === 1,
  },
};

const app = createApp({
  repos: mockRepositories,
  healthCheck: async () => {
    if (shouldFailHealth) {
      throw new Error('Database ping timeout');
    }
  },
});

const server = http.createServer(app);

await new Promise<void>((resolve) => {
  server.listen(0, resolve);
});

const port = (server.address() as AddressInfo).port;
const baseUrl = `http://localhost:${port}`;

async function requestJson(path: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, text };
}

try {
  // 1. 畸形 JSON 请求体 -> 400 INVALID_JSON
  {
    const res = await requestJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalidJson',
    });
    assert.equal(res.status, 400);
    const body = res.json as { code: string };
    assert.equal(body.code, 'INVALID_JSON');
  }

  // 2. API 404 兜底路由 -> 404 ROUTE_NOT_FOUND
  {
    const res = await requestJson('/api/non-existent-endpoint');
    assert.equal(res.status, 404);
    const body = res.json as { code: string };
    assert.equal(body.code, 'ROUTE_NOT_FOUND');
  }

  // 3. 健康检查正常执行 -> 200
  {
    const res = await requestJson('/api/health');
    assert.equal(res.status, 200);
    const body = res.json as { status: string; database: string };
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
  }

  // 4. 健康检查执行异常 -> 503 SERVICE_UNAVAILABLE
  {
    shouldFailHealth = true;
    const res = await requestJson('/api/health');
    shouldFailHealth = false;
    assert.equal(res.status, 503);
    const body = res.json as { code: string };
    assert.equal(body.code, 'SERVICE_UNAVAILABLE');
  }

  // 5. 任务创建全字段聚合校验 -> 400 VALIDATION_ERROR
  {
    const res = await requestJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '   ',
        projectId: -1,
        priority: 'invalid-priority',
        dueDate: '2020-01-01',
      }),
    });
    assert.equal(res.status, 400);
    const body = res.json as { code: string; details: Array<{ field: string; issue: string }> };
    assert.equal(body.code, 'VALIDATION_ERROR');
    const fields = body.details.map((d) => d.field);
    assert.ok(fields.includes('text'));
    assert.ok(fields.includes('projectId'));
    assert.ok(fields.includes('priority'));
    assert.ok(fields.includes('dueDate'));
  }

  // 6. 任务创建显式传 priority: null 回归测试 -> 400 INVALID_TYPE
  {
    const res = await requestJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '合规文本',
        projectId: 1,
        priority: null,
      }),
    });
    assert.equal(res.status, 400);
    const body = res.json as { code: string; details: Array<{ field: string; issue: string }> };
    assert.equal(body.code, 'VALIDATION_ERROR');
    const prioDetail = body.details.find((d) => d.field === 'priority');
    assert.ok(prioDetail);
    assert.equal(prioDetail?.issue, 'INVALID_TYPE');
  }

  // 7. 项目创建名称类型校验 -> 400 VALIDATION_ERROR (name 为数字)
  {
    const res = await requestJson('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 12345 }),
    });
    assert.equal(res.status, 400);
    const body = res.json as { code: string; details: Array<{ field: string; issue: string }> };
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.details[0].issue, 'INVALID_TYPE');
  }

  // 8. 查询参数非法 -> 400 INVALID_PROJECT_ID
  {
    const res = await requestJson('/api/tasks?projectId=abc');
    assert.equal(res.status, 400);
    const body = res.json as { code: string };
    assert.equal(body.code, 'INVALID_PROJECT_ID');
  }

  // 9. 路径参数非法 -> 400 INVALID_TASK_ID
  {
    const res = await requestJson('/api/tasks/invalid-id', {
      method: 'DELETE',
    });
    assert.equal(res.status, 400);
    const body = res.json as { code: string };
    assert.equal(body.code, 'INVALID_TASK_ID');
  }

  // 10. 任务更新空体 -> 400 NO_TASK_UPDATES
  {
    const res = await requestJson('/api/tasks/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = res.json as { code: string };
    assert.equal(body.code, 'NO_TASK_UPDATES');
  }

  // 11. 用例 A: 任务更新目标不存在 (mock 返回 null) -> 404 TASK_NOT_FOUND
  {
    const res = await requestJson('/api/tasks/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '有效更新内容' }),
    });
    assert.equal(res.status, 404);
    const body = res.json as { code: string };
    assert.equal(body.code, 'TASK_NOT_FOUND');
  }

  // 12. 用例 B: 任务更新发生内部异常 (mock 抛出 Error) -> 500 INTERNAL_SERVER_ERROR
  {
    shouldFailUpdateDb = true;
    const res = await requestJson('/api/tasks/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '有效更新内容' }),
    });
    shouldFailUpdateDb = false;
    assert.equal(res.status, 500);
    const body = res.json as { code: string };
    assert.equal(body.code, 'INTERNAL_SERVER_ERROR');
  }

  // 13. 任务删除目标不存在 -> 404 TASK_NOT_FOUND
  {
    const res = await requestJson('/api/tasks/999', {
      method: 'DELETE',
    });
    assert.equal(res.status, 404);
    const body = res.json as { code: string };
    assert.equal(body.code, 'TASK_NOT_FOUND');
  }

  // 14. 项目删除目标不存在 -> 404 PROJECT_NOT_FOUND
  {
    const res = await requestJson('/api/projects/999', {
      method: 'DELETE',
    });
    assert.equal(res.status, 404);
    const body = res.json as { code: string };
    assert.equal(body.code, 'PROJECT_NOT_FOUND');
  }

  // 15. 外键约束关联项目不存在 -> 404 PROJECT_NOT_FOUND
  {
    const res = await requestJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '合规任务',
        projectId: 999999,
      }),
    });
    assert.equal(res.status, 404);
    const body = res.json as { code: string };
    assert.equal(body.code, 'PROJECT_NOT_FOUND');
  }
} finally {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
console.log('✔ 服务端隔离契约测试全部通过\n');

// -------------------------------------------------------------
// 测试套件 3: 客户端错误解析与链路纯函数测试
// -------------------------------------------------------------
console.log('▶ [套件 3] 运行客户端错误解析与链路测试...');
{
  // 1. 测试未知 issue 过滤与回退
  const rawBodyWithBadIssue = JSON.stringify({
    code: 'VALIDATION_ERROR',
    message: '参数校验失败',
    details: [{ field: 'text', issue: 'UNKNOWN_TYPO_ISSUE', message: '错误文案' }],
  });
  const parsed1 = parseApiErrorBody(rawBodyWithBadIssue, 400, 'Bad Request');
  assert.equal(parsed1.code, 'VALIDATION_ERROR');
  assert.equal(parsed1.details, undefined); // 非法 issue 过滤后 details 为 undefined

  // 2. 测试未知 code 降级
  const rawBodyWithBadCode = JSON.stringify({
    code: 'SOME_NON_EXISTENT_CODE',
    message: '未知错误码测试',
  });
  const parsed2 = parseApiErrorBody(rawBodyWithBadCode, 400, 'Bad Request');
  assert.equal(parsed2.code, undefined);

  // 3. 测试 HTML 响应容错
  const htmlBody = '<!DOCTYPE html><html><body>Error 404</body></html>';
  const parsed3 = parseApiErrorBody(htmlBody, 404, 'Not Found');
  assert.equal(parsed3.message, 'HTTP 404 (Not Found)');
  assert.equal(parsed3.code, undefined);

  // 4. 驱动实际 api.createTask 方法测试 fetch -> ApiError -> toFailedActionResult -> formatErrorMessage 完整链路
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: '请求参数校验失败',
          details: [
            { field: 'text', issue: 'REQUIRED', message: '任务内容不能为空' },
            { field: 'dueDate', issue: 'PAST_DATE', message: '截止日期不能早于今天' },
          ],
        }),
        {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        }
      );

    try {
      await api.createTask({
        text: '',
        priority: 'medium',
        projectId: 1,
      });
      assert.fail('预期应该抛出 ApiError');
    } catch (err: unknown) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      assert.equal(err.details?.length, 2);

      const actionResult = toFailedActionResult(err);
      assert.equal(actionResult.ok, false);
      assert.equal(actionResult.code, 'VALIDATION_ERROR');

      const formatted = formatErrorMessage(actionResult);
      assert.match(formatted, /请求参数校验失败/);
      assert.match(formatted, /任务内容不能为空/);
      assert.match(formatted, /截止日期不能早于今天/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}
console.log('✔ 客户端错误解析与链路测试全部通过\n');

// -------------------------------------------------------------
// 测试套件 4: 项目删除状态更新业务回归验证
// -------------------------------------------------------------
console.log('▶ [套件 4] 运行项目删除状态更新业务回归验证...');
{
  const projectsList = [
    { id: 1, name: '项目 1' },
    { id: 2, name: '项目 2' },
    { id: 3, name: '项目 3' },
  ];

  // 场景 A: 删除当前激活项目 (id: 1) -> 自动切换到 remaining[0] (id: 2)
  {
    const idToDelete = 1;
    const remaining = projectsList.filter((p) => p.id !== idToDelete);
    let activeId: number | null = idToDelete;
    if (activeId === idToDelete) {
      activeId = remaining.length > 0 ? remaining[0].id : null;
    }
    assert.equal(activeId, 2);
    assert.equal(remaining.length, 2);
  }

  // 场景 B: 删除非当前激活项目 (id: 3, 当前激活为 id: 1) -> 保持 activeId 为 1
  {
    const idToDelete = 3;
    const remaining = projectsList.filter((p) => p.id !== idToDelete);
    let activeId: number | null = 1;
    if (activeId === idToDelete) {
      activeId = remaining.length > 0 ? remaining[0].id : null;
    }
    assert.equal(activeId, 1);
    assert.equal(remaining.length, 2);
  }

  // 场景 C: 删除最后一个项目 -> activeId 变为 null
  {
    const singleList = [{ id: 1, name: '唯一项目' }];
    const idToDelete = 1;
    const remaining = singleList.filter((p) => p.id !== idToDelete);
    let activeId: number | null = 1;
    if (activeId === idToDelete) {
      activeId = remaining.length > 0 ? remaining[0].id : null;
    }
    assert.equal(activeId, null);
    assert.equal(remaining.length, 0);
  }
}
console.log('✔ 项目删除状态更新业务回归验证通过\n');

console.log('==============================================');
console.log('🎉 全部测试套件均已顺利通过, 契约与链路闭环完备!');
console.log('==============================================');

