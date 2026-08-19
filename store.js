// 默认任务列表
const DefaultTasks = [
    { id: 1, text: 'Learn JavaScript', done: false },
    { id: 2, text: 'Build Dashboard', done: false },
    { id: 3, text: 'Learn Git', done: false },
];

// 获取本地任务，无则返回默认
export function getTasks() {
    const storageTasks = localStorage.getItem('task-list');

    return storageTasks ? JSON.parse(storageTasks) : structuredClone(DefaultTasks);
}

// 保存任务到本地
export function saveTasks(tasks) {
    localStorage.setItem('task-list', JSON.stringify(tasks));
}

// 根据 id 删除任务
export function deleteTask(tasks, id) {
    return tasks.filter(task => task.id !== id);
}