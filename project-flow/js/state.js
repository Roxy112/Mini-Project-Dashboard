import { getProjects, saveProjects, deleteProject as deleteProjectFromStore, getTasks, saveTasks, deleteTask as deleteTaskFromStore } from './store.js';

export const state = {
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
const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
}

function notify() {
    listeners.forEach(fn => fn());
}

// 项目相关的状态变更方法
export function setActiveProjectId(id) {
    state.activeProjectId = id;
    notify();
}

export function addProject(name) {
    const newProject = {
        id: Date.now(),
        name
    };
    state.projects.push(newProject);
    saveProjects(state.projects);
    state.activeProjectId = newProject.id;
    notify();
    return newProject;
}

export function deleteProject(id) {
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
export function addTask({ text, priority, dueDate }) {
    const newTask = {
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

export function updateTask(id, updates) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        Object.assign(task, updates);
        saveTasks(state.tasks);
        notify();
    }
    return task;
}

export function deleteTask(id) {
    state.tasks = deleteTaskFromStore(state.tasks, id);
    saveTasks(state.tasks);
    notify();
}

// 筛选条件的状态变更方法
export function setFilter(type, value) {
    if (type in state.filters) {
        state.filters[type] = value;
        notify();
    }
}
