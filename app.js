// 任务数据
let task = [
    { id: 1, text: 'Learn JavaScript', done: false },
    { id: 2, text: 'Build Dashboard', done: false },
    { id: 3, text: 'Learn Git', done: false }
]

// 获取任务列表的父容器<ul>
const taskList = document.querySelector('.tasks ul');

// 渲染任务列表
function renderTasks() {
    taskList.innerHTML = '';
    task.forEach(task => {
        const li = document.createElement('li');
        li.innerHTML = `
            <label>
                <input type="checkbox" class="item-check" ${task.done ? 'check' : ''}>
                <span class="item-task">${task.txt}</span>
            </label>
        `;
        taskList.appendChild(li);
    });
}

renderTasks();

// 给勾选的任务添加删除线


// 监听整个列表的 change 事件
taskList.addEventListener('change', function(event) {
    // 检查触发事件的元素是不是复选框（.item-check）
    if (event.target.classList.contains('item-check')) {
        // 找到复选框所在的 <label> 里的 <span>
        const text = event.target.parentElement.querySelector('.item-task');
        // 切换删除线类
        text.classList.toggle('line-through', event.target.checked);
    }
});

// Add Task
// 获取“添加任务”按钮
const addBtn = document.querySelector('.add-task-button');

// 获取输入框元素
const taskInput = document.getElementById('new-task-input');

addBtn.addEventListener('click',function() {
    // 获取输入框中的文本
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        alert('请输入任务内容！');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: taskText,
        done: false
    };
    TextTrack.push(newTask);

    // 清空输入框
    taskInput.value = '';
});

