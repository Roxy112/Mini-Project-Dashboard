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

// 表单输入数据（由 Tasks 表单组件收集）
export interface TaskFormData {
    text: string;
    priority: Priority;
    dueDate?: string;
}

// 创建任务请求参数（发送给 API / 后端）
export interface CreateTaskParams extends TaskFormData {
    projectId: number;
}

export type UpdateTaskParams = Partial<Omit<Task, 'id' | 'projectId'>>;
