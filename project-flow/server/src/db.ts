import { Project, Task } from '../../src/types/index';

// 内存中的初始数据
export let projects: Project[] = [
  { id: 1, name: 'Project A' },
  { id: 2, name: 'Project B' },
];

export let tasks: Task[] = [
  { id: 1, text: 'Learn JavaScript', done: false, projectId: 1, priority: 'medium' },
  { id: 2, text: 'Build Dashboard', done: false, projectId: 1, priority: 'medium' },
  { id: 3, text: 'Learn Git', done: false, projectId: 1, priority: 'medium' },
];

// 操作内存数组的辅助方法
export const db = {
  getProjects: () => projects,
  addProject: (name: string): Project => {
    const newProject: Project = { id: Date.now(), name };
    projects.push(newProject);
    return newProject;
  },
  deleteProject: (id: number): boolean => {
    const exists = projects.some(p => p.id === id);
    if (!exists) return false;
    projects = projects.filter(p => p.id !== id);
    // 级联删除：删除项目时，连带删除其关联的所有任务
    tasks = tasks.filter(t => t.projectId !== id);
    return true;
  },

  getTasks: (projectId?: number) => {
    if (projectId !== undefined) {
      return tasks.filter(t => t.projectId === projectId);
    }
    return tasks;
  },
  addTask: (params: { text: string; priority: 'low' | 'medium' | 'high'; projectId: number; dueDate?: string }): Task => {
    const newTask: Task = {
      id: Date.now(),
      done: false,
      ...params,
    };
    tasks.push(newTask);
    return newTask;
  },
  updateTask: (id: number, updates: Partial<Omit<Task, 'id' | 'projectId'>>): Task | null => {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return null;
    const current = tasks[taskIndex];
    // 白名单合并与不可变字段保护，防止非法字段注入和主键/外键篡改
    tasks[taskIndex] = {
      ...current,
      ...(updates.text !== undefined && { text: updates.text }),
      ...(updates.done !== undefined && { done: updates.done }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
      id: current.id,
      projectId: current.projectId,
    };
    return tasks[taskIndex];
  },
  deleteTask: (id: number): boolean => {
    const exists = tasks.some(t => t.id === id);
    if (!exists) return false;
    tasks = tasks.filter(t => t.id !== id);
    return true;
  },
};