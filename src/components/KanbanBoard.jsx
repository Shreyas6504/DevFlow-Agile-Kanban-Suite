import React, { useState } from 'react';
import { useKanban } from '../hooks/useKanban';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', icon: 'bi-inbox', badge: 'bg-secondary' },
  { id: 'in-progress', title: 'In Progress', icon: 'bi-lightning', badge: 'bg-primary' },
  { id: 'review', title: 'Code Review', icon: 'bi-eye', badge: 'bg-warning text-dark' },
  { id: 'completed', title: 'Done', icon: 'bi-check-circle', badge: 'bg-success' }
];

export function KanbanBoard() {
  const { tasks, isLoading, moveTask, filterPriority, setFilterPriority, searchQuery, setSearchQuery } = useKanban();
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedTaskId) {
      moveTask(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (isLoading) {
    return <div className="text-center py-5 text-muted">Synchronizing Agile Sprint Board...</div>;
  }

  return (
    <div className="kanban-wrapper p-3">
      {/* Search & Filter Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex gap-2 align-items-center">
          <input
            type="text"
            className="form-control form-control-sm bg-dark text-light border-secondary"
            placeholder="🔍 Search sprint tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-select form-select-sm bg-dark text-light border-secondary"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* 4-Stage Kanban Grid */}
      <div className="row g-3">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className="col-12 col-md-6 col-xl-3"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="kanban-column bg-dark border border-secondary rounded-3 p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold text-light">
                    <i className={`bi ${col.icon} me-1`}></i> {col.title}
                  </h6>
                  <span className={`badge ${col.badge} rounded-pill`}>{colTasks.length}</span>
                </div>

                <div className="task-list d-flex flex-column gap-2">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="task-card card bg-secondary-subtle border-secondary p-2 cursor-grab shadow-sm"
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className={`badge priority-${task.priority.toLowerCase()} font-monospace`} style={{ fontSize: '0.65rem' }}>
                          {task.priority}
                        </span>
                        <small className="text-muted font-monospace" style={{ fontSize: '0.68rem' }}>{task.id}</small>
                      </div>
                      <h6 className="card-title text-light fs-6 mb-1">{task.title}</h6>
                      <p className="card-text text-secondary mb-2" style={{ fontSize: '0.75rem' }}>{task.description}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>📅 {task.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KanbanBoard;
