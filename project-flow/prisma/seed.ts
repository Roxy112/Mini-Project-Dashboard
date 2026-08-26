import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 正在向 PostgreSQL 写入初始种子数据...');

  // 清理旧数据
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();

  // 创建示例项目 Project A 与初始任务
  const projectA = await prisma.project.create({
    data: {
      name: 'Project A',
      tasks: {
        create: [
          { text: 'Learn JavaScript', done: false, priority: 'medium' },
          { text: 'Build Dashboard', done: false, priority: 'medium' },
          { text: 'Learn Git', done: false, priority: 'medium' },
        ],
      },
    },
    include: {
      tasks: true,
    },
  });

  // 创建示例项目 Project B
  const projectB = await prisma.project.create({
    data: {
      name: 'Project B',
    },
  });

  console.log(`✅ 种子数据写入完成！`);
  console.log(`- 项目: ${projectA.name} (包含 ${projectA.tasks.length} 个任务)`);
  console.log(`- 项目: ${projectB.name}`);
}

main()
  .catch((e) => {
    console.error('❌ 种子数据写入出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
