// 初始化项目数据
let projects = getProjects();
let activeProjectId = (projects && projects.length > 0) ? projects[0].id : null;
const projectButtons = document.querySelector('.project-buttons');

// 渲染项目列表
function renderProjects() {
    projectButtons.innerHTML = '';
    const fragment = document.createDocumentFragment();

    projects.forEach(project => {
        const wrapper = document.createElement('div');
        wrapper.className = 'project-item-wrapper';

        const button = document.createElement('button');
        button.textContent = project.name;
        button.className = 'project-btn';
        button.dataset.id = project.id;
        if (project.id === activeProjectId) {
            button.classList.add('active');
        }

        const delBtn = document.createElement('button');
        delBtn.textContent = 'x';
        delBtn.className = 'delete-project-btn';
        delBtn.dataset.id = project.id;

        wrapper.append(button, delBtn);
        fragment.appendChild(wrapper);
    });

    projectButtons.appendChild(fragment);
}

renderProjects();

// 监听项目点击切换当前项目
projectButtons.addEventListener('click', function (event) {
    if (event.target.classList.contains('project-btn')) {
        activeProjectId = Number(event.target.dataset.id);
        renderProjects();
        renderTasks();
    } else if (event.target.classList.contains('delete-project-btn')) {
        const id = Number(event.target.dataset.id);
        if (!confirm('确认删除这个项目以及它的所有任务吗？')) return;

        projects = deleteProject(projects, id);
        saveProjects(projects);

        // 删除该项目关联的所有任务
        tasks = tasks.filter(t => t.projectId !== id);
        saveTasks(tasks);

        if (activeProjectId === id) {
            activeProjectId = projects.length > 0 ? projects[0].id : null;
        }

        renderProjects();
        renderTasks();
    }
});

// 获取新建项目表单元素
const projectForm = document.getElementById('new-project-form');
const projectInput = document.getElementById('new-project-input');

// 监听新增项目提交
projectForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const projectName = projectInput.value.trim();

    if (!projectName) {
        alert('请输入项目名称！');
        return;
    }

    const newProject = {
        id: Date.now(),
        name: projectName
    };

    projects.push(newProject);
    saveProjects(projects);

    // 自动切换到新项目
    activeProjectId = newProject.id;

    renderProjects();
    renderTasks();
    projectInput.value = '';
});

// 获取当日日期
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 设置默认显示当日任务
const taskDate = document.getElementById('new-task-date');
taskDate.value = getTodayDateString();

// 初始化任务数据
let tasks = getTasks();
const taskList = document.querySelector('.tasks ul');
const taskForm = document.querySelector('.tasks form');
const taskInput = document.getElementById('new-task-input');
const taskSubmitBtn = taskForm.querySelector('button[type="submit"]');
const taskPriority = document.getElementById('new-task-priority');

// 渲染任务列表
function renderTasks() {
    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    if (!activeProjectId) {
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

    const filteredTasks = tasks.filter(task => task.projectId === activeProjectId);

    filteredTasks.forEach(task => {
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

        // 任务优先级标签
        const priorityBadge = document.createElement('span');
        const prio = task.priority || 'medium';
        priorityBadge.textContent = prio.toUpperCase();
        priorityBadge.className = `priority-badge prio-${prio}`;

        // 编辑按钮
        const editBtn = document.createElement('button');
        editBtn.textContent = 'edit';
        editBtn.className = 'edit-task';
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
        label.append(input, span);
        if (dateBadge) label.append(dateBadge);
        label.append(priorityBadge);
        li.append(label, actionDiv);
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

// 监听删除和编辑按钮点击
taskList.addEventListener('click', function (event) {
    if (event.target.classList.contains('delete-task')) {
        const id = Number(event.target.dataset.id);
        tasks = deleteTask(tasks, id);
        saveTasks(tasks);
        renderTasks();
    } else if (event.target.classList.contains('edit-task')) {
        const id = Number(event.target.dataset.id);
        const currentTask = tasks.find(t => t.id === id);

        if (currentTask) {
            const newText = prompt('编辑任务:', currentTask.text);
            // 确保用户没有点击取消，并且输入了非空字符
            if (newText !== null && newText.trim() !== '') {
                currentTask.text = newText.trim();
                saveTasks(tasks);
                renderTasks();
            }
        }
    }
});

// 监听新增任务提交
taskForm.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!activeProjectId) {
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

    tasks.push({
        id: Date.now(),
        text: taskText,
        done: false,
        projectId: activeProjectId,
        priority: taskPrioritySelect,
        dueDate: taskDateValue
    });

    saveTasks(tasks);
    renderTasks();
    taskInput.value = '';
    taskDate.value = getTodayDateString();
});

