import React, { useState } from 'react';
import { Project } from '../types/index';

interface ProjectsProps {
  projects: Project[];
  activeProjectId: number | null;
  onSelectProject: (id: number) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: number) => void;
}

export default function Projects({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
}: ProjectsProps): React.JSX.Element {
  const [newProjectName, setNewProjectName] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      alert('请输入项目名称！');
      return;
    }
    onAddProject(trimmed);
    setNewProjectName('');
  };

  const handleDelete = (id: number) => {
    if (!confirm('确认删除这个项目以及它的所有任务吗？')) return;
    onDeleteProject(id);
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
              onClick={() => onSelectProject(project.id)}
            >
              {project.name}
            </button>
            <button
              className="delete-project-btn"
              data-id={project.id}
              onClick={() => handleDelete(project.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* 新建项目表单 */}
      <form id="new-project-form" onSubmit={handleSubmit}>
        <input
          type="text"
          id="new-project-input"
          placeholder="请输入新项目"
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
        />
        <button type="submit" className="add-project-button">+ Add Project</button>
      </form>
    </section>
  );
}
