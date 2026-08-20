import { getProjects, saveProjects, deleteProject } from './store.js';
import { renderTasks, deleteTasksByProjectId } from './tasks.js';
import { updateDashboardStats } from './app.js';

export let projects = getProjects();
export let activeProjectId = (projects && projects.length > 0) ? projects[0].id : null;
const projectButtons = document.querySelector('.project-buttons');

// 获取新建项目表单元素
const projectForm = document.getElementById('new-project-form');
const projectInput = document.getElementById('new-project-input');

// 渲染项目列表
export function renderProjects() {
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
    updateDashboardStats();
}

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
        deleteTasksByProjectId(id);

        if (activeProjectId === id) {
            activeProjectId = projects.length > 0 ? projects[0].id : null;
        }

        renderProjects();
        renderTasks();
    }
});

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
