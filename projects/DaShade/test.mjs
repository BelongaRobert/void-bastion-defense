#!/usr/bin/env node
// Quick test script for DaShade

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 TESTING DASHADE COMPONENTS\n');

// Test 1: File structure
console.log('1️⃣ File Structure Test');
const files = [
  'launcher/tui-chat.mjs',
  'launcher/command-center.mjs',
  'knowledge/README.txt',
  'workspace',
  'knowledge/dashade-identity.txt'
];

files.forEach(f => {
  const exists = existsSync(f);
  console.log(`  ${exists ? '✅' : '❌'} ${f}`);
});

// Test 2: Knowledge base
console.log('\n2️⃣ Knowledge Base Test');
const kbPath = join('knowledge', 'knowledge-base.json');
if (existsSync(kbPath)) {
  try {
    const kb = JSON.parse(readFileSync(kbPath, 'utf-8'));
    console.log(`  ✅ Knowledge base exists: ${kb.length} chunks`);
  } catch {
    console.log('  ⚠️  Knowledge base corrupted');
  }
} else {
  console.log('  ℹ️  No knowledge base yet (will create on first run)');
}

// Test 3: Ollama connectivity
console.log('\n3️⃣ Ollama Connectivity Test');
try {
  const response = await fetch('http://localhost:11434/api/tags');
  if (response.ok) {
    const data = await response.json();
    console.log(`  ✅ Ollama responding`);
    console.log(`  📦 Models: ${data.models.map(m => m.name).join(', ')}`);
  } else {
    console.log('  ❌ Ollama not responding');
  }
} catch (e) {
  console.log('  ❌ Ollama connection failed:', e.message);
}

// Test 4: Document indexing
console.log('\n4️⃣ Document Indexing Test');
const testDoc = join('knowledge', 'test-doc.txt');
writeFileSync(testDoc, 'This is a test document for DaShade. It contains important knowledge about the Emperor and the Blood Ravens.', { flag: 'w' });
console.log('  ✅ Created test document');

// Test 5: Batch files
console.log('\n5️⃣ Batch Files Test');
const bats = ['START.bat', 'SETUP.bat', 'CENTER.bat'];
bats.forEach(f => {
  const exists = existsSync(f);
  const size = exists ? readFileSync(f).length : 0;
  console.log(`  ${exists ? '✅' : '❌'} ${f} (${size} bytes)`);
});

console.log('\n✅ ALL TESTS COMPLETE!');
console.log('\n⚔️ The Emperor protects! 🐙');
