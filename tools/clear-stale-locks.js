#!/usr/bin/env node
/**
 * clear-stale-locks.js - Removes stale session lock files
 * 
 * Usage:
 *   node clear-stale-locks.js [--older-than N] [--force]
 * 
 * Options:
 *   --older-than N   Consider locks stale if older than N minutes (default: 5)
 *   --force          Remove all locks regardless of age
 * 
 * Run this before starting OpenClaw if you encounter "session file locked" errors.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSIONS_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');
const LOCK_SUFFIX = '.jsonl.lock';

function parseArgs() {
    const args = process.argv.slice(2);
    let olderThanMinutes = 5;
    let force = false;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--older-than' && i + 1 < args.length) {
            olderThanMinutes = parseInt(args[i + 1], 10) || 5;
            i++;
        } else if (args[i] === '--force') {
            force = true;
        }
    }
    
    return { olderThanMinutes, force };
}

function clearStaleLocks(options = {}) {
    const { olderThanMinutes = 5, force = false } = options;
    
    console.log('[clear-stale-locks] Checking for stale session locks...');
    
    if (!fs.existsSync(SESSIONS_DIR)) {
        console.log('[clear-stale-locks] Sessions directory not found:', SESSIONS_DIR);
        console.log('[clear-stale-locks] Nothing to clean.');
        return { cleared: 0, kept: 0 };
    }
    
    const files = fs.readdirSync(SESSIONS_DIR);
    const lockFiles = files.filter(f => f.endsWith(LOCK_SUFFIX));
    
    if (lockFiles.length === 0) {
        console.log('[clear-stale-locks] No lock files found.');
        return { cleared: 0, kept: 0 };
    }
    
    let cleared = 0;
    let kept = 0;
    const now = Date.now();
    
    for (const lockFile of lockFiles) {
        const lockPath = path.join(SESSIONS_DIR, lockFile);
        
        try {
            const stats = fs.statSync(lockPath);
            const ageMs = now - stats.mtime.getTime();
            const ageMinutes = Math.floor(ageMs / 60000);
            
            if (force || ageMinutes > olderThanMinutes) {
                fs.unlinkSync(lockPath);
                const action = force ? '(forced)' : `(${ageMinutes} min old)`;
                console.log(`  Cleared: ${lockFile} ${action}`);
                cleared++;
            } else {
                console.log(`  Keeping: ${lockFile} (${ageMinutes} min old)`);
                kept++;
            }
        } catch (err) {
            console.error(`  Error checking ${lockFile}: ${err.message}`);
        }
    }
    
    console.log(`[clear-stale-locks] Result: ${cleared} cleared, ${kept} kept`);
    return { cleared, kept };
}

// Run if executed directly
if (require.main === module) {
    const options = parseArgs();
    const result = clearStaleLocks(options);
    process.exit(0);
}

module.exports = { clearStaleLocks };
