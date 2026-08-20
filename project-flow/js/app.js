import { projects, renderProjects } from './projects.js';
import { tasks, renderTasks } from './tasks.js';

// 更新 Dashboard 统计数据
export function updateDashboardStats() {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.done).length;
    const pendingTasks = totalTasks - completedTasks;

    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const statProjectsEl = document.getElementById('stat-projects');
    if (statProjectsEl) statProjectsEl.textContent = totalProjects;

    const statTasksEl = document.getElementById('stat-tasks');
    if (statTasksEl) statTasksEl.textContent = totalTasks;

    const statCompletedEl = document.getElementById('stat-completed');
    if (statCompletedEl) statCompletedEl.textContent = completedTasks;

    const statPendingEl = document.getElementById('stat-pending');
    if (statPendingEl) statPendingEl.textContent = pendingTasks;

    const statRateTextEl = document.getElementById('stat-rate-text');
    if (statRateTextEl) statRateTextEl.textContent = `${completionRate}%`;

    const statRateBarEl = document.getElementById('stat-rate-bar');
    if (statRateBarEl) statRateBarEl.style.width = `${completionRate}%`;
}

// 应用初始化
renderProjects();
renderTasks();
