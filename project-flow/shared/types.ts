export type Priority = 'low' | 'medium' | 'high';

export interface Project {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  text: string;
  done: boolean;
  projectId: number;
  priority: Priority;
  dueDate?: string | null;
}
