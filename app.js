// 初始化项目数据
let projects = getProjects() || [];
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
        button.textContent = project.text;
        button.className = 'project-btn';
        button.dataset.id = project.id;
        if (project.id === activeProjectId) {
            button.classList.add('active');
        }

        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
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
        if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;
        
        projects = deleteProject(projects, id);
        saveProjects(projects);
        
        // Remove associated tasks
        tasks = tasks.filter(t => t.projectID !== id);
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
        text: projectName
    };

    projects.push(newProject);
    saveProjects(projects);
    
    // 自动切换到新项目
    activeProjectId = newProject.id;
    
    renderProjects();
    renderTasks();
    projectInput.value = '';
});

// 初始化任务数据
let tasks = getTasks();
const taskList = document.querySelector('.tasks ul');

// 渲染任务列表
function renderTasks() {
    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const filteredTasks = tasks.filter(task => task.projectID === activeProjectId);

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
        projectID: activeProjectId
    });

    saveTasks(tasks);
    renderTasks();
    taskInput.value = '';
});

