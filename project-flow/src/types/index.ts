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
    projectId: number | null;
    priority: Priority;
    dueDate?: string;
}

export interface AppFilters {
    status: StatusFilter;
    priority: PriorityFilter;
}

export interface AppState {
    projects: Project[];
    tasks: Task[];
    activeProjectId: number | null;
    filters: AppFilters;
}

export type StateListener = () => void;

export interface CreateTaskParams {
    text: string;
    priority: Priority;
    dueDate?: string;
}

export type UpdateTaskParams = Partial<Omit<Task, 'id'>>;
