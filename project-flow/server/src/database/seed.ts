import pool from './pool';

async function seed() {
  console.log('正在向 PostgreSQL 写入初始种子数据 (pg)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 清理旧数据并重置序列 (级联清理 tasks)
    await client.query('TRUNCATE TABLE projects RESTART IDENTITY CASCADE;');

    // 2. 插入 Project A
    const projectAResult = await client.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING id, name;',
      ['Project A']
    );
    const projectA = projectAResult.rows[0];

    // 3. 插入 Project A 关联的初始 tasks
    const tasks = [
      { text: 'Learn JavaScript', priority: 'medium' },
      { text: 'Build Dashboard', priority: 'medium' },
      { text: 'Learn Git', priority: 'medium' },
    ];

    for (const task of tasks) {
      await client.query(
        'INSERT INTO tasks (project_id, text, done, priority) VALUES ($1, $2, $3, $4);',
        [projectA.id, task.text, false, task.priority]
      );
    }

    // 4. 插入 Project B
    const projectBResult = await client.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING id, name;',
      ['Project B']
    );
    const projectB = projectBResult.rows[0];

    await client.query('COMMIT');

    console.log('✅ 种子数据写入完成:');
    console.log(`- 项目: ${projectA.name} (包含 ${tasks.length} 个初始任务)`);
    console.log(`- 项目: ${projectB.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 种子数据写入失败, 已回滚事务:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
