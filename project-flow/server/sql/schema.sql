-- ========================================================
-- ProjectFlow - PostgreSQL 数据库初始化脚本
-- ========================================================

-- 1. 清理已有表（按依赖反向删除）
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TYPE IF EXISTS "Priority" CASCADE;
DROP TYPE IF EXISTS priority CASCADE;

-- 2. 创建 projects 表
CREATE TABLE projects (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL CHECK (trim(name) <> '')
);

-- 3. 创建 tasks 表
CREATE TABLE tasks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (trim(text) <> ''),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE DEFAULT NULL
);

-- 4. 创建索引以优化按 project_id 查询任务的性能
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
