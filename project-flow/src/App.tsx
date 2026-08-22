import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import { getProjects, saveProjects, getTasks, saveTasks } from './services/storage';
import { Project, Task, CreateTaskParams, UpdateTaskParams, StatusFilter, PriorityFilter } from './types/index';

export default function App(): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [tasks, setTasks] = useState<Task[]>(() => getTasks());
  const [activeProjectId, setActiveProjectId] = useState<number | null>(() =>
    projects[0]?.id ?? null
  );
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');

  // 本地持久化同步
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // 新增项目
  const handleAddProject = (name: string) => {
    const newProject: Project = {
      id: Date.now(),
      name,
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  // 删除项目（及级联删除关联任务）
  const handleDeleteProject = (id: number) => {
    const remainingProjects = projects.filter(p => p.id !== id);
    setProjects(remainingProjects);
    setTasks(prev => prev.filter(t => t.projectId !== id));

    if (activeProjectId === id) {
      setActiveProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null);
    }
  };

  // 新增任务
  const handleAddTask = (params: CreateTaskParams) => {
    const newTask: Task = {
      id: Date.now(),
      done: false,
      ...params,
    };
    setTasks(prev => [...prev, newTask]);
  };

  // 更新任务（状态、文本等）
  const handleUpdateTask = (id: number, updates: UpdateTaskParams) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  // 删除任务
  const handleDeleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

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
