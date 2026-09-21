import React, { useState, useEffect } from 'react';
import { Task, Priority, StatusFilter, PriorityFilter, TaskFormData, UpdateTaskParams, ActionResult } from '../types/index';

interface TasksProps {
  tasks: Task[];
  activeProjectId: number | null;
  filterStatus: StatusFilter;
  filterPriority: PriorityFilter;

  onFilterStatusChange: (status: StatusFilter) => void;
  onFilterPriorityChange: (priority: PriorityFilter) => void;
  onAddTask: (data: TaskFormData) => Promise<ActionResult>;
  onUpdateTask: (id: number, updates: UpdateTaskParams) => Promise<ActionResult>;
  onDeleteTask: (id: number) => Promise<ActionResult>;
}

/**
 * 获取当前日期的 YYYY-MM-DD 格式字符串 (用于日期选择器默认值与最小值)
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化任务截止日期徽章文本 (如 "2026-09-17" 转换为 "Sep 17")
 * @param dueDate 原始日期字符串
 */
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

/**
 * 任务列表展示, 筛选, 创建与编辑组件
 */
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
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDate, setNewTaskDate] = useState<string>(getTodayDateString);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [taskActionError, setTaskActionError] = useState<string | null>(null);

  // 行内编辑状态
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const hasActiveProject = activeProjectId !== null;

  // 当切换所属项目时, 自动清理当前行内编辑状态与所有错误提示
  useEffect(() => {
    setEditingTaskId(null);
    setEditingText('');
    setEditingDescription('');
    // 清空未处理的创建, 编辑与删除错误提示
    setCreateError(null);
    setEditError(null);
    setTaskActionError(null);
  }, [activeProjectId]);

  // 使用 useMemo 缓存过滤计算结果, 避免无关状态变更触发重复运算
  const filteredTasks = React.useMemo(() => {
    let result = tasks.filter(task => task.projectId === activeProjectId);
    if (filterStatus === 'active') {
      result = result.filter(t => !t.done);
    } else if (filterStatus === 'completed') {
      result = result.filter(t => t.done);
    }
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }
    return result;
  }, [tasks, activeProjectId, filterStatus, filterPriority]);

  /**
   * 提交新建任务表单
   */
  const handleAddTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    // 重置并清除上一次提交的错误提示
    setCreateError(null);
    setEditError(null);
    setTaskActionError(null);

    // 校验是否已选择有效项目
    if (activeProjectId === null) {
      setCreateError('请先添加或选择一个项目!');
      return;
    }

    // 校验任务文本内容是否为空
    const trimmed = newTaskText.trim();
    if (!trimmed) {
      setCreateError('请输入任务内容!');
      return;
    }

    const todayStr = getTodayDateString();
    if (newTaskDate && newTaskDate < todayStr) {
      setCreateError('截止日期不能早于今天!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onAddTask({
        text: trimmed,
        priority: newTaskPriority,
        dueDate: newTaskDate || undefined,
        description: newTaskDescription.trim(),
      });

      if (result.ok) {
        setNewTaskText('');
        setNewTaskDescription('');
        setNewTaskDate(getTodayDateString());
        // 任务创建成功, 确保错误状态已重置
        setCreateError(null);
      } else {
        // 任务创建失败, 设置后端返回的错误信息
        setCreateError(`创建任务失败: ${result.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 开启指定任务的行内编辑状态
   * @param task 当前要编辑的任务对象
   */
  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
    setEditingDescription(task.description || '');
    // 开始编辑时清除先前的编辑错误提示
    setEditError(null);
  };

  /**
   * 保存指定任务的行内编辑内容
   * @param id 任务 ID
   */
  const handleSaveEdit = async (id: number) => {
    if (isSavingEdit) return;
    // 重置编辑错误状态
    setEditError(null);
    const trimmed = editingText.trim();
    if (!trimmed) {
      // 校验编辑内容是否为空
      setEditError('任务内容不能为空!');
      return;
    }
    
    setIsSavingEdit(true);
    try {
      const result = await onUpdateTask(id, {
        text: trimmed,
        description: editingDescription.trim() || null
      });

      if (result.ok) {
        setEditingTaskId(null);
        setEditingText('');
        setEditingDescription('');
        // 更新成功, 重置编辑错误状态
        setEditError(null);
      } else {
        // 更新失败, 设置后端返回的错误信息
        setEditError(`更新任务失败: ${result.message}`);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * 取消当前正在编辑的状态并重置编辑字段
   */
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingText('');
    setEditingDescription('');
    // 取消编辑时重置错误提示
    setEditError(null);
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

      {/* 任务操作错误提示横幅 (更新状态/删除错误) */}
      {taskActionError && (
        <div role="alert" className="form-error" style={{ margin: '0 0 12px 0' }}>
          {taskActionError}
        </div>
      )}

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
                    onChange={async e => {
                      // 重置先前的任务操作错误提示
                      setTaskActionError(null);
                      const result = await onUpdateTask(task.id, { done: e.target.checked });
                      if (!result.ok) {
                        setTaskActionError(`更新任务状态失败: ${result.message}`);
                      }
                    }}
                  />

                  <div className="task-info">
                    {isEditing ? (
                      <div className="edit-task-fields">
                        {/* 行内编辑错误提示 */}
                        {editError && (
                          <div role="alert" className="form-error">
                            {editError}
                          </div>
                        )}
                        <input
                          type="text"
                          className="edit-task-input"
                          aria-label={`正在编辑任务 "${task.text}"`}
                          value={editingText}
                          placeholder="任务内容"
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
                        <textarea
                          className="edit-task-desc-input"
                          aria-label={`正在编辑任务 "${task.text}" 的描述`}
                          value={editingDescription}
                          placeholder="任务描述 (可选)"
                          maxLength={1000}
                          rows={2}
                          onChange={e => setEditingDescription(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleSaveEdit(task.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="task-text-wrapper">
                        <span className={`item-task ${task.done ? 'line-through' : ''}`}>
                          {task.text}
                        </span>
                        {task.description && (
                          <div className={`task-desc ${task.done ? 'line-through' : ''}`}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="task-badges">
                    {dateText && (
                      <span className="task-date-badge">{dateText}</span>
                    )}
                    <span className={`priority-badge prio-${prio}`}>
                      {prio.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="task-actions">
                  {isEditing ? (
                    <button
                      type="button"
                      className="save-task"
                      aria-label={`保存任务 "${task.text}" 的修改`}
                      onClick={() => handleSaveEdit(task.id)}
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? 'saving...' : 'save'}
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
                    onClick={async () => {
                      // 重置先前的删除错误提示
                      setTaskActionError(null);
                      const result = await onDeleteTask(task.id);
                      if (!result.ok) {
                        // 删除失败, 设置错误提示文案
                        setTaskActionError(`删除任务 "${task.text}" 失败: ${result.message}`);
                      }
                    }}
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
      <form className="add-task-form" onSubmit={handleAddTaskSubmit}>
        {/* 表单错误提示横幅 (仅在存在错误时渲染) */}
        {createError && (
          <div role="alert" className="form-error">
            {createError}
          </div>
        )}
        <div className="add-task-fields">
          <input
            type="text"
            id="new-task-input"
            aria-label="新任务内容"
            placeholder={hasActiveProject ? '请输入新任务内容...' : '请先添加或选择一个项目'}
            disabled={!hasActiveProject}
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
          />

          <textarea
            id="new-task-desc"
            className="new-task-desc"
            aria-label="新任务描述 (可选)"
            placeholder="添加任务描述 (可选)"
            maxLength={1000}
            rows={2}
            disabled={!hasActiveProject}
            value={newTaskDescription}
            onChange={e => setNewTaskDescription(e.target.value)}
          />
        </div>

        <div className="add-task-footer">
          <div className="add-task-options">
            <input
              type="date"
              id="new-task-date"
              aria-label="任务截止日期"
              min={getTodayDateString()}
              disabled={!hasActiveProject}
              value={newTaskDate}
              onChange={e => setNewTaskDate(e.target.value)}
            />

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
          </div>

          <button
            type="submit"
            className="add-task-button"
            aria-label="添加新任务"
            disabled={!hasActiveProject || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : '+ Add Task'}
          </button>
        </div>
      </form>
    </section>
  );
}
