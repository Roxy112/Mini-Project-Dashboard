import pool from './pool';

async function runTimezoneVerification() {
  console.log('--- 开始进行数据库 DATE 字段时区及往返一致性自动化验证 ---');
  const client = await pool.connect();

  try {
    // 1. 验证 DateStyle 设置
    const dateStyleRes = await client.query('SHOW DateStyle;');
    console.log(`[Check 1] PostgreSQL DateStyle: ${dateStyleRes.rows[0].DateStyle}`);

    // 2. 创建临时测试项目
    const projRes = await client.query(
      "INSERT INTO projects (name) VALUES ('TZ Test Project') RETURNING id;"
    );
    const projectId = projRes.rows[0].id;

    // 3. 插入指定 dueDate 任务
    const testDate = '2026-12-31';
    const insertRes = await client.query(
      'INSERT INTO tasks (project_id, text, due_date) VALUES ($1, $2, $3) RETURNING id, due_date AS "dueDate";',
      [projectId, 'Timezone verification task', testDate]
    );

    const insertedDueDate = insertRes.rows[0].dueDate;
    console.log(`[Check 2] 插入后 RETURNING dueDate: ${insertedDueDate} (类型: ${typeof insertedDueDate})`);
    if (insertedDueDate !== testDate) {
      throw new Error(`日期返回不一致: 预期 ${testDate}, 实际收到 ${insertedDueDate}`);
    }

    // 4. SELECT 重新读取验证
    const selectRes = await client.query(
      'SELECT due_date AS "dueDate" FROM tasks WHERE id = $1;',
      [insertRes.rows[0].id]
    );
    const selectedDueDate = selectRes.rows[0].dueDate;
    console.log(`[Check 3] SELECT 查询 dueDate: ${selectedDueDate} (类型: ${typeof selectedDueDate})`);
    if (selectedDueDate !== testDate) {
      throw new Error(`查询日期不一致: 预期 ${testDate}, 实际收到 ${selectedDueDate}`);
    }

    // 5. UPDATE 更新为另一日期并验证
    const updatedTestDate = '2027-01-01';
    const updateRes = await client.query(
      'UPDATE tasks SET due_date = $1 WHERE id = $2 RETURNING due_date AS "dueDate";',
      [updatedTestDate, insertRes.rows[0].id]
    );
    const updatedDueDate = updateRes.rows[0].dueDate;
    console.log(`[Check 4] UPDATE 更新后 dueDate: ${updatedDueDate} (类型: ${typeof updatedDueDate})`);
    if (updatedDueDate !== updatedTestDate) {
      throw new Error(`更新日期不一致: 预期 ${updatedTestDate}, 实际收到 ${updatedDueDate}`);
    }

    // 6. 清理测试数据
    await client.query('DELETE FROM projects WHERE id = $1;', [projectId]);
    console.log('✅ 多时区往返一致性验证全部通过！');
  } finally {
    client.release();
    await pool.end();
  }
}

runTimezoneVerification().catch((err) => {
  console.error('❌ 验证失败:', err);
  process.exit(1);
});
