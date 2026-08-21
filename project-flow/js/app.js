import { subscribe } from './state.js';
import { renderProjects, initProjects } from './projects.js';
import { renderTasks, initTasks } from './tasks.js';
import { updateDashboardStats } from './stats.js';

// 统一协调所有模块的视图渲染
export function renderApp() {
    renderProjects();
    renderTasks();
    updateDashboardStats();
}

// 订阅状态变更：一旦 state 改变，自动由 app.js 统一协调刷新全部视图
subscribe(renderApp);

// 初始化各模块事件监听与首次全量渲染
initProjects();
initTasks();
renderApp();
