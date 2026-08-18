// 默认任务列表
const DefaultTasks = [
    { id: 1, text: 'Learn JavaScript', done: false },
    { id: 2, text: 'Build Dashboard', done: false },
    { id: 3, text: 'Learn Git', done: false },
];

// 获取本地任务，无则返回默认
function getTasks() {
    const storageTasks = localStorage.getItem('task-list');
    
    return storageTasks ? JSON.parse(storageTasks) : structuredClone(DefaultTasks);
}

// 保存任务到本地
function saveTasks() {
    localStorage.setItem('task-list', JSON.stringify(tasks));
}

// 根据 id 删除任务
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

// 初始化任务数据
let tasks = getTasks();
const taskList = document.querySelector('.tasks ul');

// 渲染任务列表
function renderTasks() {
    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    tasks.forEach(task => {
        const li = document.createElement('li');
        const label = document.createElement('label');

        // 复选框
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'item-check';
        input.dataset.id = task.id;
        input.checked = task.done;

        // 任务文本
        const span = document.createElement('span');
        span.className = 'item-task';
        if (task.done) span.classList.add('line-through');
        span.textContent = task.text;

        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'delete';
        deleteBtn.className = 'delete-task';
        deleteBtn.dataset.id = task.id;

        // 组装 DOM
        label.append(input, span);
        li.append(label, deleteBtn);
        fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
}

renderTasks();

// 监听复选框状态变化
taskList.addEventListener('change', function (event) {
    if (event.target.classList.contains('item-check')) {
        const taskId = Number(event.target.dataset.id);
        const currentTask = tasks.find(t => t.id === taskId);

        if (currentTask) {
            currentTask.done = event.target.checked;
            saveTasks();
        }
        renderTasks();
    }
});

// 监听删除按钮点击
taskList.addEventListener('click', function (event) {
    if (event.target.classList.contains('delete-task')) {
        deleteTask(Number(event.target.dataset.id));
    }
});

// 获取表单元素
const taskForm = document.querySelector('.tasks form');
const taskInput = document.getElementById('new-task-input');

// 监听新增任务提交
taskForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const taskText = taskInput.value.trim();

    if (!taskText) {
        alert('请输入任务内容！');
        return;
    }

    tasks.push({
        id: Date.now(),
        text: taskText,
        done: false,
    });

    saveTasks();
    renderTasks();
    taskInput.value = '';
});

