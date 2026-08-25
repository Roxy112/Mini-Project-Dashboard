import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import { api } from './services/api';
import { Project, Task, TaskFormData, UpdateTaskParams, StatusFilter, PriorityFilter } from './types/index';

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
      } catch (err: any) {
        console.error('初始化数据失败:', err);
        setError(err.message || '从后端加载数据失败');
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // 2. 新增项目
  const handleAddProject = async (name: string) => {
    try {
      const newProject = await api.createProject(name);
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
    } catch (err: any) {
      alert(`创建项目失败: ${err.message}`);
    }
  };

  // 3. 删除项目
  const handleDeleteProject = async (id: number) => {
    try {
      await api.deleteProject(id);
      const remainingProjects = projects.filter(p => p.id !== id);
      setProjects(remainingProjects);
      // 同步更新前端任务列表（后端已级联删除）
      setTasks(prev => prev.filter(t => t.projectId !== id));

      if (activeProjectId === id) {
        setActiveProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null);
      }
    } catch (err: any) {
      alert(`删除项目失败: ${err.message}`);
    }
  };

  // 4. 新增任务
  const handleAddTask = async (formData: TaskFormData) => {
    if (activeProjectId === null) {
      alert('请先添加或选择一个项目！');
      return;
    }

    try {
      const newTask = await api.createTask({
        ...formData,
        projectId: activeProjectId,
      });
      setTasks(prev => [...prev, newTask]);
    } catch (err: any) {
      alert(`创建任务失败: ${err.message}`);
    }
  };

  // 5. 更新任务
  const handleUpdateTask = async (id: number, updates: UpdateTaskParams) => {
    try {
      const updatedTask = await api.updateTask(id, updates);
      setTasks(prev => prev.map(t => (t.id === id ? updatedTask : t)));
    } catch (err: any) {
      alert(`更新任务失败: ${err.message}`);
    }
  };

  // 6. 删除任务
  const handleDeleteTask = async (id: number) => {
    try {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(`删除任务失败: ${err.message}`);
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