// 给勾选的任务添加删除线
// 获取任务列表的父容器<ul>
const taskList = document.querySelector('.tasks ul');

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
    // 将获取到的文本插入到新元素的指定位置
    const newTaskHTML = `
        <li>
            <label>
                <input type="checkbox" class="item-check">
                <span class="item-task">${taskText}</span>
            </label>
        </li>
    `;

    //插入到 <ul> 内部的末尾
    taskList.insertAdjacentHTML('beforeend', newTaskHTML);

    // 清空输入框
    taskInput.value = '';
});

