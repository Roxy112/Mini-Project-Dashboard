import React from 'react';
import { Project, Task } from '../types/index';

interface SidebarProps {
  projects: Project[];
  tasks: Task[];
}

export default function Sidebar({ projects, tasks }: SidebarProps): React.JSX.Element {
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.done).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <aside className="sidebar">
      <h3>ProjectFlow Dashboard</h3>
      <div className="stats-container">
        <div className="stat-card">
          <span className="stat-label">Projects</span>
          <span className="stat-value" id="stat-projects">{totalProjects}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tasks</span>
          <span className="stat-value" id="stat-tasks">{totalTasks}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" id="stat-completed">{completedTasks}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value" id="stat-pending">{pendingTasks}</span>
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <span>Completion Rate</span>
            <span id="stat-rate-text">{completionRate}%</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              id="stat-rate-bar"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
