import { Project, Task, Priority } from '../../../shared/types';

export interface ProjectRepository {
  getAll(): Promise<Project[]>;
  create(data: { name: string }): Promise<Project>;
  delete(id: number): Promise<boolean>;
}

export interface TaskRepository {
  getAll(projectId?: number): Promise<Task[]>;
  create(data: {
    text: string;
    priority: Priority;
    projectId: number;
    dueDate?: string | null;
    description?: string | null;
  }): Promise<Task>;
  update(
    id: number,
    updates: {
      text?: string;
      done?: boolean;
      priority?: Priority;
      dueDate?: string | null;
      description?: string | null;
    }
  ): Promise<Task | null>;
  delete(id: number): Promise<boolean>;
}

export interface DataRepositories {
  projects: ProjectRepository;
  tasks: TaskRepository;
}

