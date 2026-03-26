#!/usr/bin/env node
/**
 * DaSage Security Audit
 * Checks workspace for common security issues
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || 'C:/Users/belon/.openclaw/workspace';
const REPORT_FILE = join(WORKSPACE_DIR, 'memory', 'security-audit-report.md');

const findings = {
  issues: [],
  warnings: [],
  info: []
};

function log(msg) {
  console.log(msg);
}

// Check for .env files
async function checkEnvFiles() {
  log('Checking .env files...');
  try {
    const files = await readdir(WORKSPACE_DIR, { recursive: true });
    const envFiles = files.filter(f => f.includes('.env'));
    
    for (const file of envFiles) {
      const fullPath = join(WORKSPACE_DIR, file);
      const gitignorePath = join(fullPath, '..', '.gitignore');
      
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, 'utf-8');
        if (!gitignore.includes('.env')) {
          findings.warnings.push(`.env file not in .gitignore: ${file}`);
        }
      }
      findings.info.push(`Found .env file: ${file}`);
    }
  } catch (e) {
    findings.warnings.push(`Could not scan for .env files: ${e.message}`);
  }
}

// Check for large files
async function checkLargeFiles() {
  log('Checking for large files...');
  try {
    const files = await readdir(WORKSPACE_DIR, { recursive: true });
    
    for (const file of files) {
      const fullPath = join(WORKSPACE_DIR, file);
      try {
        const stats = statSync(fullPath);
        if (stats.isFile() && stats.size > 50 * 1024 * 1024) { // 50MB
          const sizeMB = Math.round(stats.size / (1024 * 1024));
          findings.info.push(`Large file: ${file} (${sizeMB}MB)`);
        }
      } catch (e) {}
    }
  } catch (e) {
    findings.warnings.push(`Could not check file sizes: ${e.message}`);
  }
}

// Check backup status
function checkBackups() {
  log('Checking backup status...');
  const backupDir = join(WORKSPACE_DIR, '..', 'backups');
  
  if (!existsSync(backupDir)) {
    findings.warnings.push('No backup directory found');
    return;
  }
  
  try {
    const files = execSync('dir /b', { cwd: backupDir, encoding: 'utf-8' }).trim().split('\n');
    const backups = files.filter(f => f.startsWith('workspace-'));
    
    if (backups.length === 0) {
      findings.warnings.push('No backups found in backup directory');
    } else {
      const latest = backups.sort().pop();
      findings.info.push(`Latest backup: ${latest}`);
      findings.info.push(`Total backups: ${backups.length}`);
    }
  } catch (e) {
    findings.warnings.push(`Could not check backups: ${e.message}`);
  }
}

// Check for token exposure in files
async function checkTokenExposure() {
  log('Checking for token exposure...');
  const sensitivePatterns = [
    /[a-f0-9]{40,}/i, // SHA hashes, API keys
    /sk-[a-zA-Z0-9]{20,}/, // OpenAI keys
    /ghp_[a-zA-Z0-9]{20,}/, // GitHub tokens
    /eyJ[a-zA-Z0-9]{20,}/, // JWT tokens
  ];
  
  const checkFile = async (filePath) => {
    if (filePath.includes('node_modules')) return;
    
    try {
      const content = readFileSync(join(WORKSPACE_DIR, filePath), 'utf-8');
      const lines = content.split('\n').slice(0, 50); // Check first 50 lines
      
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of sensitivePatterns) {
          if (pattern.test(lines[i]) && !lines[i].includes('README') && !lines[i].includes('example')) {
            findings.warnings.push(`Potential token in ${filePath} line ${i + 1}`);
            return;
          }
        }
      }
    } catch (e) {}
  };
  
  // Check specific files
  const filesToCheck = [
    '.env.alerts',
    'memory/alert-log.md',
    'memory/security-audit-report.md'
  ];
  
  for (const file of filesToCheck) {
    if (existsSync(join(WORKSPACE_DIR, file))) {
      await checkFile(file);
    }
  }
}

// Main audit
async function runAudit() {
  log('Running security audit...');
  log('');
  
  await checkEnvFiles();
  await checkLargeFiles();
  checkBackups();
  await checkTokenExposure();
  
  // Generate report
  const report = `# Security Audit Report
Generated: ${new Date().toISOString()}

## Summary
- Issues: ${findings.issues.length}
- Warnings: ${findings.warnings.length}
- Info: ${findings.info.length}

## Issues
${findings.issues.length > 0 ? findings.issues.map(i => `- ${i}`).join('\n') : 'None found'}

## Warnings
${findings.warnings.length > 0 ? findings.warnings.map(w => `- ${w}`).join('\n') : 'None found'}

## Info
${findings.info.length > 0 ? findings.info.map(i => `- ${i}`).join('\n') : 'None'}

## Recommendations
1. Review .env files - ensure no production credentials
2. Run backup script regularly
3. Keep sensitive data out of memory files
4. Check git remotes use HTTPS

---
Next audit recommended: ${new Date().toISOString().split('T')[0]}
`;
  
  writeFileSync(REPORT_FILE, report);
  
  log('');
  log('Audit complete!');
  log(`Issues: ${findings.issues.length}`);
  log(`Warnings: ${findings.warnings.length}`);
  log(`Info: ${findings.info.length}`);
  log('');
  log(`Report saved to: ${REPORT_FILE}`);
  
  // Show first part of report
  console.log('\n--- Report Preview ---');
  console.log(report.split('\n').slice(0, 20).join('\n'));
}

runAudit().catch(e => {
  console.error('Audit failed:', e);
});
