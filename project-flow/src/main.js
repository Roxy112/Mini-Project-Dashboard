import './styles/style.css';
import { subscribe } from './state/state.js';
import { renderProjects, initProjects } from './modules/projects.js';
import { renderTasks, initTasks } from './modules/tasks.js';
import { updateDashboardStats } from './modules/stats.js';

// 统一协调所有模块的视图渲染
export function renderApp() {
    renderProjects();
    renderTasks();
    updateDashboardStats();
}

// 订阅状态变更：一旦 state 改变，自动由 main.js 统一协调刷新全部视图
subscribe(renderApp);

// 初始化各模块事件监听与首次全量渲染
initProjects();
initTasks();
renderApp();
