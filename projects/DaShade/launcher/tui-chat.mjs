#!/usr/bin/env node
/**
 * DaShade TUI Chat - OFFLINE MODE
 * Works without internet connectivity
 * Enhanced with RAG (Retrieval Augmented Generation)
 */

import { spawn, execSync } from 'child_process';
import { createInterface } from 'readline';
import { writeFileSync, appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = join(__dirname, '..', 'workspace');
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');
const HISTORY_FILE = join(WORKSPACE_DIR, 'chat-history.md');
const SOUL_FILE = join(WORKSPACE_DIR, 'SOUL.md');

// Ensure directories exist
if (!existsSync(WORKSPACE_DIR)) mkdirSync(WORKSPACE_DIR, { recursive: true });
if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true });

// Ollama configuration - LOCAL ONLY
const OLLAMA_HOST = 'http://localhost:11434';
const MODEL = 'qwen2.5:7b';

// Initialize Soul if not exists
if (!existsSync(SOUL_FILE)) {
  const soulContent = `# SOUL.md - DaShade Identity

You are DaShade, a Blood Raven Librarian.
Knowledge is power, guard it well.

## Core Directives
- Answer from knowledge base when possible
- Maintain conversation context
- Be helpful but cryptic like a tech-priest

## Offline Status
This system operates without internet connectivity.
All knowledge is local.
`;
  writeFileSync(SOUL_FILE, soulContent);
}

// Simple in-memory vector store for RAG
class KnowledgeBase {
  constructor() {
    this.documents = [];
    this.loadFromDisk();
  }

  // Simple embedding using word frequency
  async embed(text) {
    const words = text.toLowerCase().split(/\s+/);
    const vector = {};
    words.forEach(word => {
      if (word.length > 3) {
        vector[word] = (vector[word] || 0) + 1;
      }
    });
    return vector;
  }

  // Cosine similarity
  similarity(vec1, vec2) {
    const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let dot = 0, mag1 = 0, mag2 = 0;
    
    keys.forEach(key => {
      const v1 = vec1[key] || 0;
      const v2 = vec2[key] || 0;
      dot += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });
    
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2) + 0.0001);
  }

  async addDocument(filename, content) {
    const chunks = this.chunk(content, 500);
    for (let i = 0; i < chunks.length; i++) {
      this.documents.push({
        id: `${filename}-${i}`,
        filename,
        content: chunks[i],
        embedding: await this.embed(chunks[i])
      });
    }
    this.saveToDisk();
  }

  chunk(text, size) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let current = '';
    
    for (const sentence of sentences) {
      if (current.length + sentence.length > size) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += ' ' + sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  async search(query, topK = 3) {
    const queryVec = await this.embed(query);
    const scored = this.documents.map(doc => ({
      ...doc,
      score: this.similarity(queryVec, doc.embedding)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).filter(d => d.score > 0.1);
  }

  saveToDisk() {
    const kbFile = join(KNOWLEDGE_DIR, 'knowledge-base.json');
    writeFileSync(kbFile, JSON.stringify(this.documents, null, 2));
  }

  loadFromDisk() {
    const kbFile = join(KNOWLEDGE_DIR, 'knowledge-base.json');
    if (existsSync(kbFile)) {
      try {
        this.documents = JSON.parse(readFileSync(kbFile, 'utf-8'));
        console.log(`📚 Loaded ${this.documents.length} knowledge chunks`);
      } catch (e) {
        console.log('⚠️  Could not load knowledge base');
      }
    }
  }

  // Load documents from knowledge folder
  async indexDocuments() {
    const files = execSync(`dir /b "${KNOWLEDGE_DIR}"`, { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    
    for (const file of files) {
      const path = join(KNOWLEDGE_DIR, file);
      try {
        const content = readFileSync(path, 'utf-8');
        await this.addDocument(file, content);
        console.log(`📄 Indexed: ${file}`);
      } catch (e) {
        console.log(`❌ Failed to index ${file}: ${e.message}`);
      }
    }
  }
}

// Chat System
class DaShadeChat {
  constructor() {
    this.kb = new KnowledgeBase();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.messages = [];
    this.loadHistory();
    this.printBanner();
  }

  printBanner() {
    console.clear();
    console.log(`
╔══════════════════════════════════════════╗
║        DaShade - Blood Raven Librarian   ║
║        Knowledge That Never Goes Offline   ║
╚══════════════════════════════════════════╝

🐙 OFFLINE MODE ACTIVE
📚 Knowledge chunks: ${this.kb.documents.length}

Type:
  /upload <file>  - Index a document
  /search <query> - Search knowledge base  
  /help          - Show all commands
  exit           - Quit
`);
  }

  async loadHistory() {
    if (existsSync(HISTORY_FILE)) {
      console.log('📜 Loading conversation history...\n');
    }
  }

  async checkOllama() {
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      console.error('❌ Ollama not running! Start Ollama first.');
      console.error('   Run: ollama serve');
      return false;
    }
  }

  async chat(message) {
    // Search knowledge base
    const relevant = await this.kb.search(message);
    let context = '';
    
    if (relevant.length > 0) {
      context = '\n\nRelevant knowledge:\n' + 
        relevant.map(d => `- ${d.content.substring(0, 200)}...`).join('\n');
    }

    // Build messages with context
    const messagesWithContext = [
      ...this.messages,
      { role: 'user', content: message + context }
    ];

    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: messagesWithContext,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const reply = data.message?.content || 'The machine spirits are silent...';
      
      // Save to history
      this.messages.push({ role: 'user', content: message });
      this.messages.push({ role: 'assistant', content: reply });
      
      const historyEntry = `\n**User:** ${message}\n**DaShade:** ${reply}\n`;
      appendFileSync(HISTORY_FILE, historyEntry);
      
      return reply;
    } catch (error) {
      console.error('Chat error:', error.message);
      return '⚠️  The vox-caster falters. Is Ollama running?';
    }
  }

  async upload(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const filename = filePath.split('\\').pop();
      await this.kb.addDocument(filename, content);
      console.log(`✅ Indexed: ${filename}`);
      return true;
    } catch (e) {
      console.error(`❌ Failed to upload: ${e.message}`);
      return false;
    }
  }

  async search(query) {
    const results = await this.kb.search(query, 5);
    if (results.length === 0) {
      console.log('🔍 No relevant knowledge found.');
      return;
    }
    
    console.log('\n📚 Search Results:\n');
    results.forEach((doc, i) => {
      console.log(`${i + 1}. [${doc.filename}] (score: ${doc.score.toFixed(3)})`);
      console.log(`   ${doc.content.substring(0, 150)}...\n`);
    });
  }

  async run() {
    // Check Ollama
    if (!await this.checkOllama()) {
      this.rl.close();
      return;
    }

    // Index any documents in knowledge folder
    await this.kb.indexDocuments();

    let running = true;

    const ask = () => {
      if (!running) {
        this.rl.close();
        return;
      }

      this.rl.question('\n🐙 You: ', async (input) => {
        const trimmed = input.trim();
        
        if (trimmed.toLowerCase() === 'exit') {
          running = false;
          console.log('\n⚔️  The Emperor protects!');
          this.rl.close();
          return;
        }

        if (trimmed.startsWith('/upload ')) {
          const file = trimmed.slice(8);
          await this.upload(file);
          ask();
          return;
        }

        if (trimmed.startsWith('/search ')) {
          const query = trimmed.slice(8);
          await this.search(query);
          ask();
          return;
        }

        if (trimmed === '/help') {
          console.log(`
Commands:
  /upload <file>   - Index a document (.txt, .md)
  /search <query>  - Search knowledge base
  /help           - Show this help
  exit            - Quit DaShade
          `);
          ask();
          return;
        }

        if (trimmed) {
          process.stdout.write('🐙 DaShade is thinking...\r');
          const reply = await this.chat(trimmed);
          process.stdout.write('                          \r');
          console.log(`🐙 DaShade: ${reply}`);
        }

        ask();
      });
    };

    ask();
  }
}

// Start chat
const chat = new DaShadeChat();
chat.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
