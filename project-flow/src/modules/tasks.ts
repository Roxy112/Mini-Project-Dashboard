import { state, addTask, updateTask, deleteTask, setFilter } from '../state/state';
import { Priority, StatusFilter, PriorityFilter } from '../types/index';

const taskList = document.querySelector('.tasks ul') as HTMLUListElement | null;
const taskForm = document.querySelector('.tasks form') as HTMLFormElement | null;
const taskInput = document.getElementById('new-task-input') as HTMLInputElement | null;
const taskSubmitBtn = taskForm?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
const taskPriority = document.getElementById('new-task-priority') as HTMLSelectElement | null;
const taskDate = document.getElementById('new-task-date') as HTMLInputElement | null;
const filterStatusSelect = document.getElementById('filter-status') as HTMLSelectElement | null;
const filterPrioritySelect = document.getElementById('filter-priority') as HTMLSelectElement | null;

// 获取当日日期
function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 当前正在编辑的任务 ID（局部 UI 状态）
let editingTaskId: number | null = null;

// 保存行内编辑
function saveInlineEdit(id: number, newText: string): void {
    const trimmed = newText.trim();
    if (!trimmed) {
        alert('任务内容不能为空！');
        return;
    }
    editingTaskId = null;
    updateTask(id, { text: trimmed });
}

// 纯渲染任务列表 DOM
export function renderTasks(): void {
    if (!taskList) return;

    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    if (!state.activeProjectId) {
        if (taskInput) {
            taskInput.disabled = true;
            taskInput.placeholder = '请先添加或选择一个项目';
        }
        if (taskSubmitBtn) {
            taskSubmitBtn.disabled = true;
            taskSubmitBtn.style.opacity = '0.5';
            taskSubmitBtn.style.cursor = 'not-allowed';
        }
        if (taskPriority) {
            taskPriority.disabled = true;
            taskPriority.style.opacity = '0.5';
            taskPriority.style.cursor = 'not-allowed';
        }
        if (taskDate) {
            taskDate.disabled = true;
            taskDate.style.opacity = '0.5';
            taskDate.style.cursor = 'not-allowed';
        }
    } else {
        if (taskInput) {
            taskInput.disabled = false;
            taskInput.placeholder = '请输入新任务';
        }
        if (taskSubmitBtn) {
            taskSubmitBtn.disabled = false;
            taskSubmitBtn.style.opacity = '1';
            taskSubmitBtn.style.cursor = 'pointer';
        }
        if (taskPriority) {
            taskPriority.disabled = false;
            taskPriority.style.opacity = '1';
            taskPriority.style.cursor = 'pointer';
        }
        if (taskDate) {
            taskDate.disabled = false;
            taskDate.style.opacity = '1';
            taskDate.style.cursor = 'pointer';
        }
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
            input.dataset.id = String(task.id);
            input.checked = task.done;

            // 任务文本 / 行内编辑输入框
            let textElement: HTMLElement;
            if (isEditing) {
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.className = 'edit-task-input';
                editInput.value = task.text;
                editInput.dataset.id = String(task.id);
                // 阻止点击冒泡触发 label 内 checkbox 勾选
                editInput.addEventListener('click', (e) => e.stopPropagation());
                editInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        saveInlineEdit(task.id, editInput.value);
                    } else if (e.key === 'Escape') {
                        editingTaskId = null;
                        renderTasks();
                    }
                });
                textElement = editInput;
            } else {
                const textSpan = document.createElement('span');
                textSpan.className = 'item-task';
                if (task.done) textSpan.classList.add('line-through');
                textSpan.textContent = task.text;
                textElement = textSpan;
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
            editBtn.dataset.id = String(task.id);

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'delete';
            deleteBtn.className = 'delete-task';
            deleteBtn.dataset.id = String(task.id);

            const actionDiv = document.createElement('div');
            actionDiv.className = 'task-actions';
            actionDiv.append(editBtn, deleteBtn);

            // 截至时间
            let dateBadge: HTMLElement | null = null;
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
        const activeInput = taskList.querySelector(`.edit-task-input[data-id="${editingTaskId}"]`) as HTMLInputElement | null;
        if (activeInput) {
            activeInput.focus();
            activeInput.select();
        }
    }
}

// 初始化任务模块事件监听
export function initTasks(): void {
    if (taskDate) {
        // 设置默认显示当日任务
        taskDate.value = getTodayDateString();
    }

    // 监听筛选条件变化
    if (filterStatusSelect) {
        filterStatusSelect.addEventListener('change', function (event: Event) {
            const target = event.target as HTMLSelectElement;
            setFilter('status', target.value as StatusFilter);
        });
    }

    if (filterPrioritySelect) {
        filterPrioritySelect.addEventListener('change', function (event: Event) {
            const target = event.target as HTMLSelectElement;
            setFilter('priority', target.value as PriorityFilter);
        });
    }

    // 监听复选框状态变化
    if (taskList) {
        taskList.addEventListener('change', function (event: Event) {
            const target = event.target as HTMLInputElement;
            if (target && target.classList.contains('item-check')) {
                const taskId = Number(target.dataset.id);
                updateTask(taskId, { done: target.checked });
            }
        });

        // 监听删除和编辑/保存按钮点击
        taskList.addEventListener('click', function (event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (!target) return;

            if (target.classList.contains('delete-task')) {
                const id = Number(target.dataset.id);
                deleteTask(id);
            } else if (target.classList.contains('edit-task')) {
                const id = Number(target.dataset.id);
                editingTaskId = id;
                renderTasks();
            } else if (target.classList.contains('save-task')) {
                const id = Number(target.dataset.id);
                const inputEl = taskList.querySelector(`.edit-task-input[data-id="${id}"]`) as HTMLInputElement | null;
                if (inputEl) {
                    saveInlineEdit(id, inputEl.value);
                }
            }
        });
    }

    // 监听新增任务提交
    if (taskForm && taskInput && taskPriority && taskDate) {
        taskForm.addEventListener('submit', function (event: SubmitEvent) {
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

            const taskPrioritySelect = taskPriority.value as Priority;
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
}
