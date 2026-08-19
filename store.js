// 默认任务列表
const DefaultTasks = [
    { id: 1, text: 'Learn JavaScript', done: false, projectID: 1, priority: 'medium' },
    { id: 2, text: 'Build Dashboard', done: false, projectID: 1, priority: 'medium' },
    { id: 3, text: 'Learn Git', done: false, projectID: 1, priority: 'medium' },
];

// 获取本地任务，无则返回默认
function getTasks() {
    const storageTasks = localStorage.getItem('task-list');

    if (storageTasks) {
        try {
            const parsed = JSON.parse(storageTasks);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            console.warn('task-list 数据损坏，恢复默认设置', error);
        }
    }

    return structuredClone(DefaultTasks);
}

// 保存任务到本地
function saveTasks(tasks) {
    localStorage.setItem('task-list', JSON.stringify(tasks));
}

// 根据 id 删除任务
function deleteTask(tasks, id) {
    return tasks.filter(task => task.id !== id);
}

// 默认项目列表 
const DefaultProjects = [
    { id: 1, text: 'Project A' },
    { id: 2, text: 'Project B' },
]

// 获取本地项目，无则返回默认
function getProjects() {
    const storageProjects = localStorage.getItem('project-list');

    if (storageProjects) {
        try {
            const parsed = JSON.parse(storageProjects);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            console.warn('project-list 数据损坏，恢复默认设置', error);
        }
    }

    return structuredClone(DefaultProjects);
}

// 保存项目到本地
function saveProjects(projects) {
    localStorage.setItem('project-list', JSON.stringify(projects));
}

// 根据 id 删除项目
function deleteProject(projects, id) {
    return projects.filter(project => project.id !== id);
}