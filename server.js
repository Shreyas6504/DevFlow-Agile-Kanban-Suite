/**
 * DevFlow — Agile Kanban & Sprint Analytics Server
 * Author: Shreyas Shetty (https://github.com/Shreyas6504)
 * Architecture: Node.js, Express REST API, In-Memory Sprint State with JSON Persistence
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS & Security Headers Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Seed Sprint Data
let tasks = [
  {
    id: "task-101",
    title: "Implement OAuth2 & JWT Refresh Token Rotation",
    description: "Architect secure authentication middleware with httpOnly cookies and Redis token blacklisting.",
    status: "in-progress",
    priority: "Critical",
    dueDate: "2026-11-25",
    tags: ["auth", "backend", "security"],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-102",
    title: "Optimize React Board Drag-and-Drop Re-renders",
    description: "Profile Kanban column updates using React.memo and useCallback to achieve smooth 60fps card transitions.",
    status: "review",
    priority: "High",
    dueDate: "2026-11-23",
    tags: ["react", "ui", "performance"],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-103",
    title: "Setup Prometheus Metrics & Health Endpoint",
    description: "Expose CPU, memory usage, and endpoint response latencies for sprint observability.",
    status: "completed",
    priority: "Medium",
    dueDate: "2026-11-20",
    tags: ["devops", "monitoring"],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-104",
    title: "Design Sprint Velocity & Burndown Charts",
    description: "Integrate Chart.js doughnut and bar charts for workload balancing across engineering squad.",
    status: "backlog",
    priority: "High",
    dueDate: "2026-11-28",
    tags: ["analytics", "chartjs"],
    createdAt: new Date().toISOString()
  }
];

// --- REST API Endpoints ---

// 1. Fetch Tasks (with optional filtering)
app.get('/api/tasks', (req, res) => {
  const { status, priority, search } = req.query;
  let filtered = [...tasks];

  if (status && status !== 'all') {
    filtered = filtered.filter(t => t.status === status);
  }
  if (priority && priority !== 'all') {
    filtered = filtered.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: filtered.length, data: filtered });
});

// 2. Create Task
app.post('/api/tasks', (req, res) => {
  const { title, description, status = 'backlog', priority = 'Medium', dueDate, tags = [] } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Task title is required.' });
  }

  const newTask = {
    id: `task-${Date.now()}`,
    title: title.trim(),
    description: (description || '').trim(),
    status,
    priority,
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    tags: Array.isArray(tags) ? tags : [],
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  res.status(201).json({ success: true, message: 'Task created successfully', task: newTask });
});

// 3. Move Task Column (Drag and Drop state update)
app.patch('/api/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['backlog', 'in-progress', 'review', 'completed'];

  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  }

  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found.' });
  }

  task.status = status;
  task.updatedAt = new Date().toISOString();
  res.json({ success: true, message: `Task moved to ${status}`, task });
});

// 4. Update Task Details
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ success: false, error: 'Task not found.' });
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...req.body,
    id, // Immutable ID
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, message: 'Task updated successfully', task: tasks[taskIndex] });
});

// 5. Delete Task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = tasks.length;
  tasks = tasks.filter(t => t.id !== id);

  if (tasks.length === initialLen) {
    return res.status(404).json({ success: false, error: 'Task not found.' });
  }

  res.json({ success: true, message: 'Task removed from sprint.' });
});

// 6. Sprint Analytics Telemetry
app.get('/api/analytics/sprint', (req, res) => {
  const total = tasks.length;
  const statusCounts = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const priorityCounts = {
    Critical: tasks.filter(t => t.priority === 'Critical').length,
    High: tasks.filter(t => t.priority === 'High').length,
    Medium: tasks.filter(t => t.priority === 'Medium').length,
    Low: tasks.filter(t => t.priority === 'Low').length,
  };

  const completionRate = total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0;

  res.json({
    success: true,
    analytics: {
      totalTasks: total,
      statusCounts,
      priorityCounts,
      completionRate,
      activeSprint: "Sprint 42 - Q4 Core Infrastructure"
    }
  });
});

// Serve Frontend Static Assets
app.use(express.static(path.join(__dirname)));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 DevFlow Agile Suite running on http://localhost:${PORT}`);
  });
}

module.exports = app;
