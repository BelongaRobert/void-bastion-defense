import os from 'os';
import { execSync } from 'child_process';

/**
 * System Monitor
 * Tracks: Disk space, CPU, Memory
 */

class SystemMonitor {
  constructor(notifier) {
    this.name = 'SystemMonitor';
    this.notifier = notifier;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
    this.thresholds = {
      disk: parseInt(process.env.DISK_THRESHOLD) || 10, // Alert at <10% free
      cpu: 80,  // Alert at >80%
      memory: 90 // Alert at >90%
    };
    this.lastAlert = {};
  }

  async start() {
    // Initial check
    await this.check();
    
    // Schedule regular checks
    this.intervalId = setInterval(() => this.check(), this.checkInterval);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async check() {
    await this.checkDisk();
    await this.checkMemory();
    // CPU check omitted for simplicity (requires sampling over time)
  }

  async checkDisk() {
    try {
      // Windows: use wmic
      const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf-8' });
      const lines = output.trim().split('\n').slice(1);
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const drive = parts[0];
          const free = parseInt(parts[1]);
          const size = parseInt(parts[2]);
          
          if (free && size) {
            const freePercent = (free / size) * 100;
            
            if (freePercent < this.thresholds.disk) {
              this.alert('low_disk', 
                `💾 Low Disk Space\n\nDrive ${drive}: ${freePercent.toFixed(1)}% free`,
                'urgent');
            }
          }
        }
      }
    } catch (err) {
      console.error('Disk check error:', err.message);
    }
  }

  async checkMemory() {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const usedPercent = ((total - free) / total) * 100;
      
      if (usedPercent > this.thresholds.memory) {
        this.alert('high_memory',
          `💾 High Memory Usage\n\nUsing ${usedPercent.toFixed(1)}% of ${(total / 1024 / 1024 / 1024).toFixed(1)} GB`,
          'urgent');
      }
    } catch (err) {
      console.error('Memory check error:', err.message);
    }
  }

  alert(key, message, priority) {
    const now = Date.now();
    // Rate limit: one alert per key per hour
    if (this.lastAlert[key] && now - this.lastAlert[key] < 60 * 60 * 1000) {
      return;
    }
    
    this.lastAlert[key] = now;
    this.notifier.notify('System Alert', message, priority);
  }

  async getStatus() {
    const total = os.totalmem();
    const free = os.freemem();
    const usedPercent = ((total - free) / total) * 100;
    return `Memory: ${usedPercent.toFixed(0)}% used`;
  }
}

export { SystemMonitor };
