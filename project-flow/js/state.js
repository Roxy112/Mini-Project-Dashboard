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

// 项目相关的状态变更方法
export function setActiveProjectId(id) {
    state.activeProjectId = id;
}

export function addProject(name) {
    const newProject = {
        id: Date.now(),
        name
    };
    state.projects.push(newProject);
    saveProjects(state.projects);
    state.activeProjectId = newProject.id;
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
    return newTask;
}

export function updateTask(id, updates) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        Object.assign(task, updates);
        saveTasks(state.tasks);
    }
    return task;
}

export function deleteTask(id) {
    state.tasks = deleteTaskFromStore(state.tasks, id);
    saveTasks(state.tasks);
}

// 筛选条件的状态变更方法
export function setFilter(type, value) {
    if (type in state.filters) {
        state.filters[type] = value;
    }
}
