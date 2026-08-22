export type Priority = 'low' | 'medium' | 'high';
export type StatusFilter = 'all' | 'active' | 'completed';
export type PriorityFilter = 'all' | Priority;

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
    dueDate?: string;
}

export interface CreateTaskParams {
    text: string;
    priority: Priority;
    dueDate?: string;
    projectId: number;
}

export type UpdateTaskParams = Partial<Omit<Task, 'id' | 'projectId'>>;
