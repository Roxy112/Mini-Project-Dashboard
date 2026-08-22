import { AppState, Project, Task, StateListener, CreateTaskParams, UpdateTaskParams, AppFilters } from '../types/index';
import {
    getProjects,
    saveProjects,
    deleteProject as deleteProjectFromStore,
    getTasks,
    saveTasks,
    deleteTask as deleteTaskFromStore
} from '../services/storage';

export const state: AppState = {
    projects: getProjects(),
    tasks: getTasks(),
    activeProjectId: null,
    filters: {
        status: 'all',
        priority: 'all'
    }
};

// 初始化 activeProjectId
if (state.projects && state.projects.length > 0) {
    state.activeProjectId = state.projects[0].id;
}

// 订阅者列表与通知机制
const listeners: StateListener[] = [];

export function subscribe(listener: StateListener): void {
    listeners.push(listener);
}

function notify(): void {
    listeners.forEach(fn => fn());
}

// 项目相关的状态变更方法
export function setActiveProjectId(id: number | null): void {
    state.activeProjectId = id;
    notify();
}

export function addProject(name: string): Project {
    const newProject: Project = {
        id: Date.now(),
        name
    };
    state.projects.push(newProject);
    saveProjects(state.projects);
    state.activeProjectId = newProject.id;
    notify();
    return newProject;
}

export function deleteProject(id: number): void {
    state.projects = deleteProjectFromStore(state.projects, id);
    saveProjects(state.projects);

    // 删除关联任务
    state.tasks = state.tasks.filter(t => t.projectId !== id);
    saveTasks(state.tasks);

    if (state.activeProjectId === id) {
        state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
    }
    notify();
}

// 任务相关的状态变更方法
export function addTask({ text, priority, dueDate }: CreateTaskParams): Task {
    const newTask: Task = {
        id: Date.now(),
        text,
        done: false,
        projectId: state.activeProjectId,
        priority,
        dueDate
    };
    state.tasks.push(newTask);
    saveTasks(state.tasks);
    notify();
    return newTask;
}

export function updateTask(id: number, updates: UpdateTaskParams): Task | undefined {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        Object.assign(task, updates);
        saveTasks(state.tasks);
        notify();
    }
    return task;
}

export function deleteTask(id: number): void {
    state.tasks = deleteTaskFromStore(state.tasks, id);
    saveTasks(state.tasks);
    notify();
}

// 筛选条件的状态变更方法
export function setFilter<K extends keyof AppFilters>(type: K, value: AppFilters[K]): void {
    if (type in state.filters) {
        state.filters[type] = value;
        notify();
    }
}
