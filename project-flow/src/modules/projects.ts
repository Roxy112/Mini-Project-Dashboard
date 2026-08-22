import { state, setActiveProjectId, addProject, deleteProject } from '../state/state';

const projectButtons = document.querySelector('.project-buttons') as HTMLElement | null;
const projectForm = document.getElementById('new-project-form') as HTMLFormElement | null;
const projectInput = document.getElementById('new-project-input') as HTMLInputElement | null;

// 纯渲染项目列表 DOM
export function renderProjects(): void {
    if (!projectButtons) return;

    projectButtons.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.projects.forEach(project => {
        const wrapper = document.createElement('div');
        wrapper.className = 'project-item-wrapper';

        const button = document.createElement('button');
        button.textContent = project.name;
        button.className = 'project-btn';
        button.dataset.id = String(project.id);
        if (project.id === state.activeProjectId) {
            button.classList.add('active');
        }

        const delBtn = document.createElement('button');
        delBtn.textContent = 'x';
        delBtn.className = 'delete-project-btn';
        delBtn.dataset.id = String(project.id);

        wrapper.append(button, delBtn);
        fragment.appendChild(wrapper);
    });

    projectButtons.appendChild(fragment);
}

// 初始化项目模块事件监听
export function initProjects(): void {
    if (!projectButtons || !projectForm || !projectInput) return;

    // 监听项目点击切换当前项目与删除项目
    projectButtons.addEventListener('click', function (event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        if (target.classList.contains('project-btn')) {
            const id = Number(target.dataset.id);
            setActiveProjectId(id);
        } else if (target.classList.contains('delete-project-btn')) {
            const id = Number(target.dataset.id);
            if (!confirm('确认删除这个项目以及它的所有任务吗？')) return;

            deleteProject(id);
        }
    });

    // 监听新增项目提交
    projectForm.addEventListener('submit', function (event: SubmitEvent) {
        event.preventDefault();
        const projectName = projectInput.value.trim();

        if (!projectName) {
            alert('请输入项目名称！');
            return;
        }

        addProject(projectName);
        projectInput.value = '';
    });
}
