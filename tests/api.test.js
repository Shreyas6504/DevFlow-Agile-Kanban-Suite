const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const http = require('http');

let server;
let baseUrl;

test.before(async () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('GET /api/tasks returns 200 and list of tasks', async () => {
  const res = await fetch(`${baseUrl}/tasks`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length >= 1);
});

test('POST /api/tasks creates a new sprint task', async () => {
  const payload = {
    title: 'Automated Test Task',
    description: 'Verifying REST API task creation',
    status: 'backlog',
    priority: 'High',
    tags: ['test', 'ci']
  };

  const res = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 201);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.task.title, payload.title);
  assert.strictEqual(json.task.priority, 'High');
});

test('PATCH /api/tasks/:id/status updates task workflow state', async () => {
  const res = await fetch(`${baseUrl}/tasks/task-101/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  });

  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.task.status, 'completed');
});

test('GET /api/analytics/sprint calculates velocity and completion rates', async () => {
  const res = await fetch(`${baseUrl}/analytics/sprint`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(typeof json.analytics.completionRate === 'number');
  assert.ok(json.analytics.totalTasks > 0);
});
