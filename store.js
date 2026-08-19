// 默认任务列表
const DefaultTasks = [
    { id: 1, text: 'Learn JavaScript', done: false, projectID: 1 },
    { id: 2, text: 'Build Dashboard', done: false, projectID: 1 },
    { id: 3, text: 'Learn Git', done: false, projectID: 1 },
];

// 获取本地任务，无则返回默认
function getTasks() {
    const storageTasks = localStorage.getItem('task-list');

    return storageTasks ? JSON.parse(storageTasks) : structuredClone(DefaultTasks);
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

function getProjects() {
    const storageProjects = localStorage.getItem('project-list');

    return storageProjects ? JSON.parse(storageProjects) : structuredClone(DefaultProjects);
}

function saveProjects(projects) {
    localStorage.setItem('project-list', JSON.stringify(projects));
}

function deleteProject(projects, id) {
    return projects.filter(project => project.id !== id);
}