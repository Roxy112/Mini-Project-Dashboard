import { state, addTask, updateTask, deleteTask, setFilter } from './state.js';

const taskList = document.querySelector('.tasks ul');
const taskForm = document.querySelector('.tasks form');
const taskInput = document.getElementById('new-task-input');
const taskSubmitBtn = taskForm.querySelector('button[type="submit"]');
const taskPriority = document.getElementById('new-task-priority');
const taskDate = document.getElementById('new-task-date');
const filterStatusSelect = document.getElementById('filter-status');
const filterPrioritySelect = document.getElementById('filter-priority');

// 获取当日日期
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 当前正在编辑的任务 ID（局部 UI 状态）
let editingTaskId = null;

// 保存行内编辑
function saveInlineEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) {
        alert('任务内容不能为空！');
        return;
    }
    editingTaskId = null;
    updateTask(id, { text: trimmed });
}

// 纯渲染任务列表 DOM
export function renderTasks() {
    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    if (!state.activeProjectId) {
        taskInput.disabled = true;
        taskInput.placeholder = '请先添加或选择一个项目';

        taskSubmitBtn.disabled = true;
        taskSubmitBtn.style.opacity = '0.5';
        taskSubmitBtn.style.cursor = 'not-allowed';

        taskPriority.disabled = true;
        taskPriority.style.opacity = '0.5';
        taskPriority.style.cursor = 'not-allowed';

        taskDate.disabled = true;
        taskDate.style.opacity = '0.5';
        taskDate.style.cursor = 'not-allowed';
    } else {
        taskInput.disabled = false;
        taskInput.placeholder = '请输入新任务';

        taskSubmitBtn.disabled = false;
        taskSubmitBtn.style.opacity = '1';
        taskSubmitBtn.style.cursor = 'pointer';

        taskPriority.disabled = false;
        taskPriority.style.opacity = '1';
        taskPriority.style.cursor = 'pointer';

        taskDate.disabled = false;
        taskDate.style.opacity = '1';
        taskDate.style.cursor = 'pointer';
    }

    let filteredTasks = state.tasks.filter(task => task.projectId === state.activeProjectId);

    if (state.filters.status === 'active') {
        filteredTasks = filteredTasks.filter(t => !t.done);
    } else if (state.filters.status === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.done);
    }

    if (state.filters.priority !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === state.filters.priority);
    }

    if (state.activeProjectId && filteredTasks.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-state';
        emptyLi.innerHTML = `
            <div class="empty-icon">📋</div>
            <div class="empty-title">No tasks yet.</div>
            <div class="empty-subtitle">Create your first task.</div>
        `;
        fragment.appendChild(emptyLi);
    } else {
        filteredTasks.forEach(task => {
            const isEditing = task.id === editingTaskId;
            const li = document.createElement('li');
            const label = document.createElement('label');

            // 复选框
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'item-check';
            input.dataset.id = task.id;
            input.checked = task.done;

            // 任务文本 / 行内编辑输入框
            let textElement;
            if (isEditing) {
                textElement = document.createElement('input');
                textElement.type = 'text';
                textElement.className = 'edit-task-input';
                textElement.value = task.text;
                textElement.dataset.id = task.id;
                // 阻止点击冒泡触发 label 内 checkbox 勾选
                textElement.addEventListener('click', (e) => e.stopPropagation());
                textElement.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        saveInlineEdit(task.id, textElement.value);
                    } else if (e.key === 'Escape') {
                        editingTaskId = null;
                        renderTasks();
                    }
                });
            } else {
                textElement = document.createElement('span');
                textElement.className = 'item-task';
                if (task.done) textElement.classList.add('line-through');
                textElement.textContent = task.text;
            }

            // 任务优先级标签
            const priorityBadge = document.createElement('span');
            const prio = task.priority || 'medium';
            priorityBadge.textContent = prio.toUpperCase();
            priorityBadge.className = `priority-badge prio-${prio}`;

            // 编辑 / 保存按钮
            const editBtn = document.createElement('button');
            editBtn.textContent = isEditing ? 'save' : 'edit';
            editBtn.className = isEditing ? 'save-task' : 'edit-task';
            editBtn.dataset.id = task.id;

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'delete';
            deleteBtn.className = 'delete-task';
            deleteBtn.dataset.id = task.id;

            const actionDiv = document.createElement('div');
            actionDiv.className = 'task-actions';
            actionDiv.append(editBtn, deleteBtn);

            // 截至时间
            let dateBadge = '';
            if (task.dueDate) {
                const parts = task.dueDate.split('-');
                if (parts.length === 3) {
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'task-date-badge';
                    dateSpan.textContent = `${monthNames[monthIndex]} ${day}`;
                    dateBadge = dateSpan;
                }
            }

            // 组装 DOM
            label.append(input, textElement);
            if (dateBadge) label.append(dateBadge);
            label.append(priorityBadge);
            li.append(label, actionDiv);
            fragment.appendChild(li);
        });
    }

    taskList.appendChild(fragment);

    // 如果处于编辑状态，自动聚焦输入框并全选文本
    if (editingTaskId) {
        const activeInput = taskList.querySelector(`.edit-task-input[data-id="${editingTaskId}"]`);
        if (activeInput) {
            activeInput.focus();
            activeInput.select();
        }
    }
}

// 初始化任务模块事件监听
export function initTasks() {
    // 设置默认显示当日任务
    taskDate.value = getTodayDateString();

    // 监听筛选条件变化
    filterStatusSelect.addEventListener('change', function (event) {
        setFilter('status', event.target.value);
    });

    filterPrioritySelect.addEventListener('change', function (event) {
        setFilter('priority', event.target.value);
    });

    // 监听复选框状态变化
    taskList.addEventListener('change', function (event) {
        if (event.target.classList.contains('item-check')) {
            const taskId = Number(event.target.dataset.id);
            updateTask(taskId, { done: event.target.checked });
        }
    });

    // 监听删除和编辑/保存按钮点击
    taskList.addEventListener('click', function (event) {
        if (event.target.classList.contains('delete-task')) {
            const id = Number(event.target.dataset.id);
            deleteTask(id);
        } else if (event.target.classList.contains('edit-task')) {
            const id = Number(event.target.dataset.id);
            editingTaskId = id;
            renderTasks();
        } else if (event.target.classList.contains('save-task')) {
            const id = Number(event.target.dataset.id);
            const inputEl = taskList.querySelector(`.edit-task-input[data-id="${id}"]`);
            if (inputEl) {
                saveInlineEdit(id, inputEl.value);
            }
        }
    });

    // 监听新增任务提交
    taskForm.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!state.activeProjectId) {
            alert('请先添加或选择一个项目！');
            return;
        }

        const taskText = taskInput.value.trim();

        if (!taskText) {
            alert('请输入任务内容！');
            return;
        }

        const taskPrioritySelect = taskPriority.value;
        const taskDateValue = taskDate.value;

        addTask({
            text: taskText,
            priority: taskPrioritySelect,
            dueDate: taskDateValue
        });

        taskInput.value = '';
        taskDate.value = getTodayDateString();
    });
}
