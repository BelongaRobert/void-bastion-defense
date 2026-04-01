#!/usr/bin/env node
/**
 * DaShade Command Center
 * Simple web UI for document management
 */

import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const KNOWLEDGE_DIR = join(ROOT_DIR, 'knowledge');
const WORKSPACE_DIR = join(ROOT_DIR, 'workspace');

const app = express();
const PORT = 3473;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Get knowledge base stats
app.get('/api/kb/stats', (req, res) => {
  try {
    const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    const kbFile = join(KNOWLEDGE_DIR, 'knowledge-base.json');
    let chunks = 0;
    if (existsSync(kbFile)) {
      const kb = JSON.parse(readFileSync(kbFile, 'utf-8'));
      chunks = kb.length;
    }
    res.json({ files: files.length, chunks });
  } catch {
    res.json({ files: 0, chunks: 0 });
  }
});

// List documents
app.get('/api/kb/documents', (req, res) => {
  try {
    const files = readdirSync(KNOWLEDGE_DIR)
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .map(f => ({
        name: f,
        size: readFileSync(join(KNOWLEDGE_DIR, f)).length
      }));
    res.json(files);
  } catch {
    res.json([]);
  }
});

// Get document content
app.get('/api/kb/document/:name', (req, res) => {
  try {
    const file = join(KNOWLEDGE_DIR, req.params.name);
    const content = readFileSync(file, 'utf-8');
    res.json({ content });
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

// Search knowledge base (simple endpoint)
app.post('/api/kb/search', express.json(), (req, res) => {
  const { query } = req.body;
  // This would connect to the actual knowledge base
  // For now, return placeholder
  res.json({ results: [], query });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

// Serve main page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>DaShade Command Center</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      background: #1a1a2e; 
      color: #eee;
      min-height: 100vh;
    }
    .header { 
      background: #16213e; 
      padding: 1rem; 
      border-bottom: 2px solid #e94560;
    }
    .header h1 { color: #e94560; }
    .container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .card { 
      background: #0f3460; 
      border-radius: 8px; 
      padding: 1.5rem; 
      margin-bottom: 1rem;
      border: 1px solid #e94560;
    }
    .card h2 { color: #e94560; margin-bottom: 1rem; }
    .stat { display: inline-block; margin-right: 2rem; }
    .stat-value { font-size: 2rem; color: #e94560; }
    .btn {
      background: #e94560;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn:hover { background: #c73e54; }
    .document-list { margin-top: 1rem; }
    .document-item {
      background: #16213e;
      padding: 0.75rem;
      margin: 0.5rem 0;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grimdark { font-style: italic; color: #888; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐙 DaShade Command Center</h1>
    <p>Knowledge That Never Goes Offline</p>
  </div>
  
  <div class="container">
    <div class="card">
      <h2>📊 Knowledge Base Stats</h2>
      <div id="stats">Loading...</div>
    </div>
    
    <div class="card">
      <h2>📚 Documents</h2>
      <div id="documents">Loading...</div>
      <p style="margin-top: 1rem;">
        <strong>To add documents:</strong> Place .txt or .md files in the <code>knowledge/</code> folder
      </p>
    </div>
    
    <div class="card">
      <h2>🎤 Launch TUI Chat</h2>
      <p>Run START.bat from the USB root for full chat with RAG.</p>
    </div>
    
    <p class="grimdark">⚔️ The Emperor protects! Knowledge is power, guard it well. 🐙</p>
  </div>
  
  <script>
    async function loadStats() {
      try {
        const res = await fetch('/api/kb/stats');
        const data = await res.json();
        document.getElementById('stats').innerHTML = \`
          \u003cdiv class="stat"\u003e
            \u003cdiv class="stat-value"\u003e\${data.files}\u003c/div\u003e
            \u003cdiv\u003eDocuments\u003c/div\u003e
          \u003c/div\u003e
          \u003cdiv class="stat"\u003e
            \u003cdiv class="stat-value"\u003e\${data.chunks}\u003c/div\u003e
            \u003cdiv\u003eKnowledge Chunks\u003c/div\u003e
          \u003c/div\u003e
        \`;
      } catch {
        document.getElementById('stats').innerHTML = '❌ Error loading stats';
      }
    }
    
    async function loadDocuments() {
      try {
        const res = await fetch('/api/kb/documents');
        const docs = await res.json();
        const html = docs.length 
          ? docs.map(d => \`
            \u003cdiv class="document-item"\u003e
              \u003cspan\u003e\${d.name}\u003c/span\u003e
              \u003cspan\u003e\${(d.size / 1024).toFixed(1)} KB\u003c/span\u003e
            \u003c/div\u003e
          \`).join('')
          : '\u003cp\u003eNo documents found. Add files to knowledge/ folder.\u003c/p\u003e';
        document.getElementById('documents').innerHTML = html;
      } catch {
        document.getElementById('documents').innerHTML = '❌ Error loading documents';
      }
    }
    
    loadStats();
    loadDocuments();
    setInterval(loadStats, 5000);
  </script>
</body>
</html>
  `);
});

// Ensure directories exist
if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true });
if (!existsSync(WORKSPACE_DIR)) mkdirSync(WORKSPACE_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`🐙 DaShade Command Center running on http://localhost:${PORT}`);
});
