/**
 * DevFlow - Agile Kanban & Productivity Suite
 * State management, HTML5 Drag-and-Drop, Chart.js analytics, LocalStorage persistence.
 */

// Initial Seed Tasks for immediate demo wow-factor
const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Implement OAuth2 & Refresh Token Rotation',
    description: 'Set up secure authorization flow with HttpOnly cookies and token blacklist cache.',
    status: 'in_progress',
    priority: 'critical',
    dueDate: '2026-11-25',
    tags: ['security', 'auth', 'backend']
  },
  {
    id: 'task-2',
    title: 'Architect Distributed Caching with Redis',
    description: 'Reduce database read latency on product catalog endpoints using stale-while-revalidate.',
    status: 'review',
    priority: 'high',
    dueDate: '2026-11-28',
    tags: ['performance', 'redis', 'devops']
  },
  {
    id: 'task-3',
    title: 'CI/CD Pipeline with Automated E2E Tests',
    description: 'Configure GitHub Actions workflow to run Playwright tests and push Docker images.',
    status: 'backlog',
    priority: 'high',
    dueDate: '2026-12-02',
    tags: ['ci/cd', 'docker', 'testing']
  },
  {
    id: 'task-4',
    title: 'Design Glassmorphism Dashboard UI',
    description: 'Craft responsive component library with dark mode tokens and accessible color contrast.',
    status: 'done',
    priority: 'medium',
    dueDate: '2026-11-15',
    tags: ['ui/ux', 'frontend', 'bootstrap']
  },
  {
    id: 'task-5',
    title: 'Optimize Core Web Vitals (LCP < 1.2s)',
    description: 'Implement modern image formats (AVIF/WebP) and font preloading.',
    status: 'backlog',
    priority: 'medium',
    dueDate: '2026-12-05',
    tags: ['frontend', 'performance']
  },
  {
    id: 'task-6',
    title: 'Audit WCAG 2.1 AA Accessibility Standards',
    description: 'Ensure screen reader compatibility and keyboard-only navigable workflows.',
    status: 'done',
    priority: 'low',
    dueDate: '2026-11-10',
    tags: ['a11y', 'qa']
  }
];

class KanbanApp {
  constructor() {
    this.storageKey = 'devflow_tasks_v1';
    this.tasks = this.loadTasks();

    // DOM containers
    this.columns = {
      backlog: document.getElementById('backlogColumn'),
      in_progress: document.getElementById('inProgressColumn'),
      review: document.getElementById('reviewColumn'),
      done: document.getElementById('doneColumn')
    };

    this.searchInput = document.getElementById('searchInput');
    this.priorityFilter = document.getElementById('priorityFilter');
    this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
    this.taskForm = document.getElementById('taskForm');

    this.statusChart = null;
    this.priorityChart = null;
    this.draggedTaskId = null;

    this.init();
  }

  loadTasks() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      localStorage.setItem(this.storageKey, JSON.stringify(INITIAL_TASKS));
      return [...INITIAL_TASKS];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_TASKS];
    }
  }

  saveTasks() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
    this.render();
  }

  init() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.render();
  }

  setupEventListeners() {
    // Search & Filter
    this.searchInput.addEventListener('input', () => this.render());
    this.priorityFilter.addEventListener('change', () => this.render());

    // Task Form Submit (Create / Edit)
    this.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveTask();
    });

    // Reset Form on modal open
    document.getElementById('addNewTaskBtn').addEventListener('click', () => {
      document.getElementById('modalActionText').innerText = 'Create New Task';
      document.getElementById('taskIdInput').value = '';
      this.taskForm.reset();
    });

    // Reset Demo Data
    document.getElementById('resetDemoBtn').addEventListener('click', () => {
      if (confirm('Restore default sample tasks?')) {
        this.tasks = [...INITIAL_TASKS];
        this.saveTasks();
      }
    });

    // Export to JSON
    document.getElementById('exportBtn').addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.tasks, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'devflow-tasks-backup.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Import from JSON
    document.getElementById('importInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            this.tasks = imported;
            this.saveTasks();
            alert('Tasks imported successfully!');
          }
        } catch {
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Analytics Modal show event
    const analyticsModalEl = document.getElementById('analyticsModal');
    analyticsModalEl.addEventListener('shown.bs.modal', () => {
      this.renderCharts();
    });
  }

  setupDragAndDrop() {
    const columnEls = document.querySelectorAll('.kanban-column');

    columnEls.forEach((col) => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const targetStatus = col.getAttribute('data-status');
        if (this.draggedTaskId && targetStatus) {
          this.updateTaskStatus(this.draggedTaskId, targetStatus);
        }
      });
    });
  }

  updateTaskStatus(taskId, newStatus) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      this.saveTasks();
    }
  }

  handleSaveTask() {
    const id = document.getElementById('taskIdInput').value || `task-${Date.now()}`;
    const title = document.getElementById('taskTitleInput').value.trim();
    const description = document.getElementById('taskDescInput').value.trim();
    const priority = document.getElementById('taskPriorityInput').value;
    const status = document.getElementById('taskStatusInput').value;
    const dueDate = document.getElementById('taskDueDateInput').value;
    const tagsRaw = document.getElementById('taskTagsInput').value;
    const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const existingIndex = this.tasks.findIndex(t => t.id === id);
    const taskObj = { id, title, description, priority, status, dueDate, tags };

    if (existingIndex > -1) {
      this.tasks[existingIndex] = taskObj;
    } else {
      this.tasks.unshift(taskObj);
    }

    this.saveTasks();
    this.taskModal.hide();
  }

  openEditModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('modalActionText').innerText = 'Edit Task';
    document.getElementById('taskIdInput').value = task.id;
    document.getElementById('taskTitleInput').value = task.title;
    document.getElementById('taskDescInput').value = task.description || '';
    document.getElementById('taskPriorityInput').value = task.priority;
    document.getElementById('taskStatusInput').value = task.status;
    document.getElementById('taskDueDateInput').value = task.dueDate || '';
    document.getElementById('taskTagsInput').value = (task.tags || []).join(', ');

    this.taskModal.show();
  }

  deleteTask(taskId) {
    if (confirm('Delete this task?')) {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.saveTasks();
    }
  }

  render() {
    const searchQuery = this.searchInput.value.toLowerCase().trim();
    const priorityVal = this.priorityFilter.value;

    // Filter tasks
    const filteredTasks = this.tasks.filter(t => {
      const matchesSearch = !searchQuery ||
        t.title.toLowerCase().includes(searchQuery) ||
        (t.description && t.description.toLowerCase().includes(searchQuery)) ||
        (t.tags && t.tags.some(tag => tag.includes(searchQuery)));

      const matchesPriority = priorityVal === 'all' || t.priority === priorityVal;
      return matchesSearch && matchesPriority;
    });

    // Clear column cards
    Object.values(this.columns).forEach(col => col.innerHTML = '');

    const counts = { backlog: 0, in_progress: 0, review: 0, done: 0 };

    filteredTasks.forEach(task => {
      if (this.columns[task.status]) {
        counts[task.status]++;
        const cardEl = this.createTaskCard(task);
        this.columns[task.status].appendChild(cardEl);
      }
    });

    // Update column badge counters
    document.querySelectorAll('.kanban-column').forEach(col => {
      const status = col.getAttribute('data-status');
      const countEl = col.querySelector('.count-badge');
      if (countEl) countEl.innerText = counts[status] || 0;

      const container = col.querySelector('.cards-container');
      if (container && container.children.length === 0) {
        container.innerHTML = '<div class="empty-placeholder">No tasks in this stage</div>';
      }
    });

    // Update global counter badges
    document.getElementById('totalTasksBadge').innerText = `Total: ${this.tasks.length}`;
    document.getElementById('completedTasksBadge').innerText = `Done: ${counts.done}`;
  }

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.setAttribute('data-id', task.id);

    card.addEventListener('dragstart', () => {
      this.draggedTaskId = task.id;
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      this.draggedTaskId = null;
      card.classList.remove('dragging');
    });

    // Format tags
    const tagsHtml = (task.tags || [])
      .map(tag => `<span class="task-tag font-monospace">#${tag}</span>`)
      .join(' ');

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <span class="badge badge-priority-${task.priority} font-monospace text-uppercase" style="font-size: 0.65rem;">
          ${task.priority}
        </span>
        <div class="card-actions">
          <button class="btn btn-sm btn-link text-secondary p-0 me-2 edit-btn" title="Edit Task">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-link text-danger p-0 delete-btn" title="Delete Task">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <h6 class="fw-semibold text-light mb-1" style="font-size: 0.88rem;">${task.title}</h6>
      ${task.description ? `<p class="text-secondary small mb-2 text-truncate" style="font-size: 0.78rem;">${task.description}</p>` : ''}
      <div class="d-flex flex-wrap gap-1 mb-2">${tagsHtml}</div>
      <div class="d-flex justify-content-between align-items-center pt-2 border-top border-secondary-subtle small font-monospace text-secondary" style="font-size: 0.72rem;">
        <span><i class="bi bi-calendar3 me-1"></i>${task.dueDate || 'No due date'}</span>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(task.id);
    });

    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteTask(task.id);
    });

    return card;
  }

  renderCharts() {
    const statusCounts = { Backlog: 0, 'In Progress': 0, 'Code Review': 0, Completed: 0 };
    const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    this.tasks.forEach(t => {
      if (t.status === 'backlog') statusCounts.Backlog++;
      else if (t.status === 'in_progress') statusCounts['In Progress']++;
      else if (t.status === 'review') statusCounts['Code Review']++;
      else if (t.status === 'done') statusCounts.Completed++;

      if (t.priority === 'critical') priorityCounts.Critical++;
      else if (t.priority === 'high') priorityCounts.High++;
      else if (t.priority === 'medium') priorityCounts.Medium++;
      else if (t.priority === 'low') priorityCounts.Low++;
    });

    // Destroy existing chart instances before rebuilding
    if (this.statusChart) this.statusChart.destroy();
    if (this.priorityChart) this.priorityChart.destroy();

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    this.statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#64748b', '#0284c7', '#f59e0b', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { family: 'Fira Code' } } }
        }
      }
    });

    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    this.priorityChart = new Chart(priorityCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(priorityCounts),
        datasets: [{
          label: 'Tasks',
          data: Object.values(priorityCounts),
          backgroundColor: ['#ef4444', '#f97316', '#38bdf8', '#94a3b8'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { family: 'Fira Code' } } },
          y: { ticks: { color: '#94a3b8', stepSize: 1 } }
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KanbanApp();
});
