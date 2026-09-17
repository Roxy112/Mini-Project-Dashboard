import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import { api } from './services/api';
import { Project, Task, TaskFormData, UpdateTaskParams, StatusFilter, PriorityFilter, ActionResult } from './types/index';

export default function App(): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');

  // 加载状态与错误处理
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. 初始化拉取数据
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        setError(null);
        const [fetchedProjects, fetchedTasks] = await Promise.all([
          api.getProjects(),
          api.getTasks(),
        ]);
        setProjects(fetchedProjects);
        setTasks(fetchedTasks);
        if (fetchedProjects.length > 0) {
          setActiveProjectId(fetchedProjects[0].id);
        }
      } catch (err: unknown) {
        console.error('初始化数据失败:', err);
        const errorMessage = err instanceof Error ? err.message : '从后端加载数据失败';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  /**
   * 新增项目处理逻辑
   * @param name 项目名称
   * @returns 操作结果 Promise<ActionResult>
   */
  const handleAddProject = async (name: string): Promise<ActionResult> => {
    try {
      const newProject = await api.createProject(name);
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      return { ok: false, message };
    }
  };

  /**
   * 删除指定项目处理逻辑
   * 同步清理本地项目与其关联的所有任务, 若为当前激活项目则自动切换激活项
   * @param id 要删除的项目 ID
   * @returns 操作结果 Promise<ActionResult>
   */
  const handleDeleteProject = async (id: number): Promise<ActionResult> => {
    try {
      await api.deleteProject(id);
      const remainingProjects = projects.filter(p => p.id !== id);
      setProjects(remainingProjects);
      // 同步更新前端任务列表 (后端已级联删除)
      setTasks(prev => prev.filter(t => t.projectId !== id));

      if (activeProjectId === id) {
        setActiveProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null);
      }

      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      return { ok: false, message };
    }
  };

  /**
   * 新增任务处理逻辑
   * @param formData 表单采集的任务信息
   * @returns 操作结果 Promise<ActionResult>
   */
  const handleAddTask = async (formData: TaskFormData): Promise<ActionResult> => {
    if (activeProjectId === null) {
      return { ok: false, message: '请先添加或选择一个项目' };
    }

    try {
      const newTask = await api.createTask({
        ...formData,
        projectId: activeProjectId,
      });
      setTasks(prev => [...prev, newTask]);
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      return { ok: false, message };
    }
  };

  /**
   * 更新指定任务处理逻辑
   * @param id 任务 ID
   * @param updates 要更新的字段对象
   * @returns 操作结果 Promise<ActionResult>
   */
  const handleUpdateTask = async (id: number, updates: UpdateTaskParams): Promise<ActionResult> => {
    try {
      const updatedTask = await api.updateTask(id, updates);
      setTasks(prev => prev.map(t => (t.id === id ? updatedTask : t)));
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      return { ok: false, message };
    }
  };

  /**
   * 删除指定任务处理逻辑
   * @param id 任务 ID
   * @returns 操作结果 Promise<ActionResult>
   */
  const handleDeleteTask = async (id: number): Promise<ActionResult> => {
    try {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      return { ok: false, message };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>
        正在连接后端并加载数据...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'red', textAlign: 'center' }}>
        <h3>加载出错</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="layout-wrapper">
      <Header />
      <hr />
      <div className="content-wrapper">
        <Sidebar projects={projects} tasks={tasks} />
        <main className="main-content">
          <Projects
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={setActiveProjectId}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
          />
          <Tasks
            tasks={tasks}
            activeProjectId={activeProjectId}
            filterStatus={filterStatus}
            filterPriority={filterPriority}
            onFilterStatusChange={setFilterStatus}
            onFilterPriorityChange={setFilterPriority}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </main>
      </div>
    </div>
  );
}