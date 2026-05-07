import { readFile, writeFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

async function readJson(filename) {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return [];
  const data = await readFile(path, 'utf8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeJson(filename, data) {
  const path = join(DATA_DIR, filename);
  await writeFile(path, JSON.stringify(data, null, 2));
}

async function appendJsonl(filename, record) {
  const path = join(DATA_DIR, filename);
  const line = JSON.stringify({ ...record, _ts: Date.now() }) + '\n';
  await appendFile(path, line);
}

async function readJsonl(filename, limit = 100) {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return [];
  const lines = (await readFile(path, 'utf8')).split('\n').filter(Boolean);
  return lines.slice(-limit).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// Tasks
export async function getTasks() { return readJson('tasks.json'); }
export async function getTask(id) { return (await getTasks()).find(t => t.id === id); }
export async function updateTask(id, updates) {
  const tasks = await getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx >= 0) {
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    await writeJson('tasks.json', tasks);
    await appendJsonl('activity.jsonl', { type: 'task', action: 'update', taskId: id, changes: Object.keys(updates) });
    return tasks[idx];
  }
  return null;
}
export async function addTask(task) {
  const tasks = await getTasks();
  const newTask = { ...task, id: task.id || `task-${Date.now()}`, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  tasks.push(newTask);
  await writeJson('tasks.json', tasks);
  await appendJsonl('activity.jsonl', { type: 'task', action: 'create', taskId: newTask.id });
  return newTask;
}

// Projects
export async function getProjects() { return readJson('projects.json'); }
export async function updateProject(name, updates) {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.name === name);
  if (idx >= 0) {
    projects[idx] = { ...projects[idx], ...updates, lastActivity: new Date().toISOString() };
    await writeJson('projects.json', projects);
    await appendJsonl('activity.jsonl', { type: 'project', action: 'update', project: name });
    return projects[idx];
  }
  return null;
}

// Activity
export async function getActivity(limit = 50) {
  const fileActivity = await readJsonl('activity.jsonl', limit);
  return fileActivity.reverse();
}
export async function logActivity(record) {
  await appendJsonl('activity.jsonl', record);
}

// Messages
export async function getMessages(limit = 100) {
  const messages = await readJson('messages.json');
  return messages.slice(-limit);
}
export async function addMessage(msg) {
  const messages = await readJson('messages.json');
  const newMsg = {
    id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from: msg.from,
    text: msg.text,
    type: msg.type || 'chat',
    timestamp: Date.now()
  };
  messages.push(newMsg);
  await writeJson('messages.json', messages);
  return newMsg;
}

// Approval Requests
export async function getRequests(status) {
  const requests = await readJson('requests.json');
  if (status) return requests.filter(r => r.status === status);
  return requests;
}
export async function addRequest(req) {
  const requests = await readJson('requests.json');
  const newReq = {
    id: req.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: req.title,
    description: req.description,
    status: 'pending',
    createdAt: Date.now(),
    resolvedAt: null,
    resolution: null
  };
  requests.push(newReq);
  await writeJson('requests.json', requests);
  return newReq;
}
export async function updateRequest(id, updates) {
  const requests = await readJson('requests.json');
  const idx = requests.findIndex(r => r.id === id);
  if (idx >= 0) {
    requests[idx] = { ...requests[idx], ...updates };
    await writeJson('requests.json', requests);
    return requests[idx];
  }
  return null;
}

export { readJson, writeJson, appendJsonl, readJsonl };
