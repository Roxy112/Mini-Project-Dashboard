import { Project, Task } from '../types/index';

// 默认任务列表
export const DefaultTasks: Task[] = [
    { id: 1, text: 'Learn JavaScript', done: false, projectId: 1, priority: 'medium' },
    { id: 2, text: 'Build Dashboard', done: false, projectId: 1, priority: 'medium' },
    { id: 3, text: 'Learn Git', done: false, projectId: 1, priority: 'medium' },
];

// 获取本地任务，无则返回默认
export function getTasks(): Task[] {
    const storageTasks = localStorage.getItem('task-list');

    if (storageTasks) {
        try {
            const parsed = JSON.parse(storageTasks);
            if (Array.isArray(parsed)) {
                return parsed as Task[];
            }
        } catch (error) {
            console.warn('task-list 数据损坏，恢复默认设置', error);
        }
    }

    return structuredClone(DefaultTasks);
}

// 保存任务到本地
export function saveTasks(tasks: Task[]): void {
    localStorage.setItem('task-list', JSON.stringify(tasks));
}

// 默认项目列表 
export const DefaultProjects: Project[] = [
    { id: 1, name: 'Project A' },
    { id: 2, name: 'Project B' },
];

// 获取本地项目，无则返回默认
export function getProjects(): Project[] {
    const storageProjects = localStorage.getItem('project-list');

    if (storageProjects) {
        try {
            const parsed = JSON.parse(storageProjects);
            if (Array.isArray(parsed)) {
                return parsed as Project[];
            }
        } catch (error) {
            console.warn('project-list 数据损坏，恢复默认设置', error);
        }
    }

    return structuredClone(DefaultProjects);
}

// 保存项目到本地
export function saveProjects(projects: Project[]): void {
    localStorage.setItem('project-list', JSON.stringify(projects));
}
