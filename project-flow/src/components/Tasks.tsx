import React, { useState, useEffect } from 'react';
import { Task, Priority, StatusFilter, PriorityFilter, TaskFormData, UpdateTaskParams } from '../types/index';

interface TasksProps {
  tasks: Task[];
  activeProjectId: number | null;
  filterStatus: StatusFilter;
  filterPriority: PriorityFilter;
  onFilterStatusChange: (status: StatusFilter) => void;
  onFilterPriorityChange: (priority: PriorityFilter) => void;
  onAddTask: (data: TaskFormData) => void;
  onUpdateTask: (id: number, updates: UpdateTaskParams) => void;
  onDeleteTask: (id: number) => void;
}

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBadge(dueDate?: string | null): string | null {
  if (!dueDate) return null;
  const parts = dueDate.split('-');
  if (parts.length === 3) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${day}`;
    }
  }
  return dueDate;
}

export default function Tasks({
  tasks,
  activeProjectId,
  filterStatus,
  filterPriority,
  onFilterStatusChange,
  onFilterPriorityChange,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: TasksProps): React.JSX.Element {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDate, setNewTaskDate] = useState<string>(getTodayDateString);

  // 行内编辑状态
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const hasActiveProject = activeProjectId !== null;

  // 当切换所属项目时，自动清理当前行内编辑状态
  useEffect(() => {
    setEditingTaskId(null);
    setEditingText('');
  }, [activeProjectId]);

  // 过滤任务
  let filteredTasks = tasks.filter(task => task.projectId === activeProjectId);

  if (filterStatus === 'active') {
    filteredTasks = filteredTasks.filter(t => !t.done);
  } else if (filterStatus === 'completed') {
    filteredTasks = filteredTasks.filter(t => t.done);
  }

  if (filterPriority !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  }

  // 提交新建任务
  const handleAddTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeProjectId === null) {
      alert('请先添加或选择一个项目！');
      return;
    }

    const trimmed = newTaskText.trim();
    if (!trimmed) {
      alert('请输入任务内容！');
      return;
    }

    const todayStr = getTodayDateString();
    if (newTaskDate && newTaskDate < todayStr) {
      alert('截止日期不能早于今天！');
      return;
    }

    onAddTask({
      text: trimmed,
      priority: newTaskPriority,
      dueDate: newTaskDate,
    });

    setNewTaskText('');
    setNewTaskDate(getTodayDateString());
  };

  // 开始行内编辑
  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  // 保存行内编辑
  const handleSaveEdit = (id: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      alert('任务内容不能为空！');
      return;
    }
    onUpdateTask(id, { text: trimmed });
    setEditingTaskId(null);
    setEditingText('');
  };

  // 取消行内编辑
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingText('');
  };

  return (
    <section className="tasks">
      <div className="tasks-header">
        <h3>Recent Tasks</h3>
        <div className="task-filters">
          <select
            id="filter-status"
            aria-label="按任务状态筛选"
            value={filterStatus}
            onChange={e => onFilterStatusChange(e.target.value as StatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <select
            id="filter-priority"
            aria-label="按任务优先级筛选"
            value={filterPriority}
            onChange={e => onFilterPriorityChange(e.target.value as PriorityFilter)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <ul>
        {!hasActiveProject ? (
          <li className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-title">未选择任何项目</div>
            <div className="empty-subtitle">请先在上方创建或选择一个项目</div>
          </li>
        ) : filteredTasks.length === 0 ? (
          <li className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">当前项目暂无任务</div>
            <div className="empty-subtitle">在下方输入框创建你的第一个任务吧</div>
          </li>
        ) : (
          filteredTasks.map(task => {
            const isEditing = task.id === editingTaskId;
            const prio = task.priority || 'medium';
            const dateText = formatDateBadge(task.dueDate);

            return (
              <li key={task.id} className="task-item">
                <div className="task-content">
                  <input
                    type="checkbox"
                    className="item-check"
                    aria-label={`标记任务 "${task.text}" 为${task.done ? '未完成' : '已完成'}`}
                    checked={task.done}
                    onChange={e => onUpdateTask(task.id, { done: e.target.checked })}
                  />

                  {isEditing ? (
                    <input
                      type="text"
                      className="edit-task-input"
                      aria-label={`正在编辑任务 "${task.text}"`}
                      value={editingText}
                      autoFocus
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(task.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                    />
                  ) : (
                    <span className={`item-task ${task.done ? 'line-through' : ''}`}>
                      {task.text}
                    </span>
                  )}

                  {dateText && (
                    <span className="task-date-badge">{dateText}</span>
                  )}
                  <span className={`priority-badge prio-${prio}`}>
                    {prio.toUpperCase()}
                  </span>
                </div>

                <div className="task-actions">
                  {isEditing ? (
                    <button
                      type="button"
                      className="save-task"
                      aria-label={`保存任务 "${task.text}" 的修改`}
                      onClick={() => handleSaveEdit(task.id)}
                    >
                      save
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="edit-task"
                      aria-label={`编辑任务 "${task.text}"`}
                      onClick={() => handleStartEdit(task)}
                    >
                      edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="delete-task"
                    aria-label={`删除任务 "${task.text}"`}
                    onClick={() => onDeleteTask(task.id)}
                  >
                    delete
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* 新建任务表单 */}
      <form onSubmit={handleAddTaskSubmit}>
        <input
          type="text"
          id="new-task-input"
          aria-label="新任务内容"
          placeholder={hasActiveProject ? '请输入新任务' : '请先添加或选择一个项目'}
          disabled={!hasActiveProject}
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
        />

        {/* 日期选择框（设置 min 为今天，禁用旧日期选择） */}
        <input
          type="date"
          id="new-task-date"
          aria-label="任务截止日期"
          min={getTodayDateString()}
          disabled={!hasActiveProject}
          value={newTaskDate}
          onChange={e => setNewTaskDate(e.target.value)}
        />

        {/* 优先级下拉框 */}
        <select
          id="new-task-priority"
          aria-label="任务优先级选择"
          disabled={!hasActiveProject}
          value={newTaskPriority}
          onChange={e => setNewTaskPriority(e.target.value as Priority)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button
          type="submit"
          className="add-task-button"
          aria-label="添加新任务"
          disabled={!hasActiveProject}
        >
          + Add Task
        </button>
      </form>
    </section>
  );
}
