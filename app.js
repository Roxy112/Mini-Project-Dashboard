// 任务数据
let tasks = [
    { id: 1, text: 'Learn JavaScript', done: false },
    { id: 2, text: 'Build Dashboard', done: false },
    { id: 3, text: 'Learn Git', done: false },
];

// 获取任务列表容器
const taskList = document.querySelector('.tasks ul');

// 根据 tasks 数组重新生成任务列表
function renderTasks() {
    taskList.innerHTML = '';

    // 在内存中创建一个文档片段
    const fragment = document.createDocumentFragment();

    tasks.forEach(task => {
        // 创建每个任务需要的列表和标签容器
        const li = document.createElement('li');
        const label = document.createElement('label');

        // 创建复选框，并根据任务状态设置是否勾选
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'item-check';
        input.dataset.id = task.id;
        input.checked = task.done;

        // 创建任务文字；已完成的任务添加删除线样式
        const span = document.createElement('span');
        span.className = 'item-task';
        if (task.done) {
            span.classList.add('line-through');
        }

        span.textContent = task.text;

        // 组装每一项任务的 DOM 结构
        label.append(input, span);
        li.append(label);

        // 先添加到文档片段，减少多次操作页面 DOM
        fragment.appendChild(li);
    });

    // 一次性将所有节点挂载到页面
    taskList.appendChild(fragment);
}

renderTasks();

// 监听任务列表中复选框的状态变化
taskList.addEventListener('change', function (event) {
    // 只处理任务复选框触发的 change 事件
    if (event.target.classList.contains('item-check')) {
        // 获取当前复选框对应任务的 id
        const taskId = event.target.dataset.id;

        // 在任务数组中找到对应任务
        const currentTask = tasks.find(t => t.id === Number(taskId));

        if (currentTask) {
            // 同步更新任务完成状态
            currentTask.done = event.target.checked;
        }

        // 重新渲染，让删除线样式与最新状态保持一致
        renderTasks();
    }
});

// 获取新建任务表单和输入框
const taskForm = document.querySelector('.tasks form');
const taskInput = document.getElementById('new-task-input');

// 监听表单提交：点击按钮或在输入框按 Enter 都会触发
taskForm.addEventListener('submit', function (event) {
    // 阻止表单默认提交导致的页面刷新
    event.preventDefault();

    // 获取并清理输入内容两侧的空格
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        alert('请输入任务内容！');
        return;
    }

    // 创建新任务并加入任务数组
    const newTask = {
        id: Date.now(),
        text: taskText,
        done: false,
    };
    tasks.push(newTask);

    // 重新渲染任务列表
    renderTasks();

    // 清空输入框，方便继续添加任务
    taskInput.value = '';
});

