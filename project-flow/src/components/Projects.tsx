import React, { useState } from 'react';
import { Project, ActionResult } from '../types/index';

/**
 * Projects 组件 Props 属性定义
 */
interface ProjectsProps {
  /** 项目列表数据 */
  projects: Project[];
  /** 当前选中的项目 ID, 未选中时为 null */
  activeProjectId: number | null;
  /** 选中项目时的回调函数 */
  onSelectProject: (id: number) => void;
  /** 添加新项目回调 (返回 ActionResult) */
  onAddProject: (name: string) => Promise<ActionResult>;
  /** 删除指定项目回调 (返回 ActionResult) */
  onDeleteProject: (id: number) => Promise<ActionResult>;
}

/**
 * 项目列表管理与切换组件
 */
export default function Projects({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
}: ProjectsProps): React.JSX.Element {
  const [newProjectName, setNewProjectName] = useState('');

  /**
   * 处理新增项目表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      alert('请输入项目名称!');
      return;
    }
    const result = await onAddProject(trimmed);
    if (result.ok) {
      setNewProjectName('');
    } else {
      alert(`创建项目失败: ${result.message}`);
    }
  };

  /**
   * 处理删除项目点击事件 (包含二次确认弹窗)
   */
  const handleDelete = async (id: number) => {
    if (!confirm('确认删除这个项目以及它的所有任务吗?')) return;
    const result = await onDeleteProject(id);
    if (!result.ok) {
      alert(`删除项目失败: ${result.message}`);
    }
  };

  return (
    <section className="projects">
      <h3>My Projects</h3>
      <div className="project-buttons">
        {projects.map(project => (
          <div className="project-item-wrapper" key={project.id}>
            <button
              className={`project-btn ${project.id === activeProjectId ? 'active' : ''}`}
              data-id={project.id}
              aria-pressed={project.id === activeProjectId}
              aria-label={`选择项目 ${project.name}`}
              onClick={() => onSelectProject(project.id)}
            >
              {project.name}
            </button>
            <button
              className="delete-project-btn"
              data-id={project.id}
              aria-label={`删除项目 ${project.name}`}
              onClick={() => handleDelete(project.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* 新建项目表单 */}
      <form id="new-project-form" onSubmit={handleSubmit}>
        <input
          type="text"
          id="new-project-input"
          aria-label="新项目名称"
          placeholder="请输入新项目"
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
        />
        <button type="submit" className="add-project-button" aria-label="创建新项目">
          + Add Project
        </button>
      </form>
    </section>
  );
}
