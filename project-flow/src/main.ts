import './styles/style.css';
import { subscribe } from './state/state';
import { renderProjects, initProjects } from './modules/projects';
import { renderTasks, initTasks } from './modules/tasks';
import { updateDashboardStats } from './modules/stats';

// 统一协调所有模块的视图渲染
export function renderApp(): void {
    renderProjects();
    renderTasks();
    updateDashboardStats();
}

// 订阅状态变更：一旦 state 改变，自动由 main.ts 统一协调刷新全部视图
subscribe(renderApp);

// 初始化各模块事件监听与首次全量渲染
initProjects();
initTasks();
renderApp();
