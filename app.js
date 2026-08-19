import { getTasks, saveTasks, deleteTask } from './store.js';

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
            saveTasks(tasks);
        }
        renderTasks();
    }
});

// 监听删除按钮点击
taskList.addEventListener('click', function (event) {
    if (event.target.classList.contains('delete-task')) {
        const id = Number(event.target.dataset.id);
        tasks = deleteTask(tasks, id);
        saveTasks(tasks);
        renderTasks();
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

    saveTasks(tasks);
    renderTasks();
    taskInput.value = '';
});

