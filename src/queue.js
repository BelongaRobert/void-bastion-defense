/**
 * DaNotify Notification Queue
 * 
 * Smart grouping, rate limiting, quiet hours
 * Single source of truth for all notifications
 */

class NotificationQueue {
  constructor(danotify) {
    this.danotify = danotify;
    this.queue = [];
    this.processing = false;
    this.lastSent = 0;
    
    // Configuration
    this.config = {
      rateLimitMs: 60000,      // Max 1 message per minute
      quietHoursStart: 23,     // 11 PM
      quietHoursEnd: 7,        // 7 AM
      bundleWindowMs: 30000,   // Bundle similar messages within 30 seconds
      maxBundleSize: 5         // Max items in a bundle
    };
    
    // Buffers for bundling
    this.buffers = new Map(); // type -> { messages, timer }
    
    // Start processing loop
    this.startProcessor();
  }
  
  /**
   * Add notification to queue
   */
  async enqueue(title, message, options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      title,
      message,
      priority: options.priority || 'normal', // normal, urgent
      source: options.source || 'unknown',
      type: options.type || 'general', // github, system, dashboard, etc.
      timestamp: Date.now(),
      options
    };
    
    // Check quiet hours (unless urgent)
    if (this.isQuietHours() && notification.priority !== 'urgent') {
      console.log(`[Queue] Deferred until morning: ${title}`);
      notification.deferred = true;
    }
    
    // Add to appropriate buffer for bundling
    this.addToBuffer(notification);
    
    return notification.id;
  }
  
  /**
   * Check if currently in quiet hours
   */
  isQuietHours() {
    const hour = new Date().getHours();
    return hour >= this.config.quietHoursStart || hour < this.config.quietHoursEnd;
  }
  
  /**
   * Add notification to type-specific buffer
   */
  addToBuffer(notification) {
    const bufferKey = `${notification.source}:${notification.type}`;
    
    if (!this.buffers.has(bufferKey)) {
      this.buffers.set(bufferKey, {
        messages: [],
        timer: null
      });
    }
    
    const buffer = this.buffers.get(bufferKey);
    buffer.messages.push(notification);
    
    // Clear existing timer
    if (buffer.timer) {
      clearTimeout(buffer.timer);
    }
    
    // If buffer is full, flush immediately
    if (buffer.messages.length >= this.config.maxBundleSize) {
      this.flushBuffer(bufferKey);
      return;
    }
    
    // Otherwise, set timer to flush after window
    buffer.timer = setTimeout(() => {
      this.flushBuffer(bufferKey);
    }, this.config.bundleWindowMs);
    
    console.log(`[Queue] Buffered ${notification.title} (${buffer.messages.length}/${this.config.maxBundleSize})`);
  }
  
  /**
   * Flush a buffer and send bundled notification
   */
  flushBuffer(bufferKey) {
    const buffer = this.buffers.get(bufferKey);
    if (!buffer || buffer.messages.length === 0) return;
    
    // Clear timer
    if (buffer.timer) {
      clearTimeout(buffer.timer);
    }
    
    const messages = buffer.messages.splice(0); // Clear buffer
    this.buffers.delete(bufferKey);
    
    // Bundle or send individually
    if (messages.length === 1) {
      this.queue.push(messages[0]);
    } else {
      // Create bundled notification
      const first = messages[0];
      const bundled = {
        id: Date.now(),
        title: `${first.source} Update`,
        message: `${messages.length} new ${first.type} notifications:\n\n${messages.map(m => `• ${m.title}`).join('\n')}`,
        priority: messages.some(m => m.priority === 'urgent') ? 'urgent' : 'normal',
        source: first.source,
        type: first.type,
        timestamp: Date.now(),
        bundled: true,
        count: messages.length
      };
      this.queue.push(bundled);
      console.log(`[Queue] Bundled ${messages.length} ${first.type} notifications`);
    }
  }
  
  /**
   * Start the processor loop
   */
  startProcessor() {
    // Process queue every 5 seconds
    setInterval(() => this.processQueue(), 5000);
    
    // Flush all buffers every minute (catch any stragglers)
    setInterval(() => this.flushAllBuffers(), 60000);
    
    console.log('[Queue] Notification processor started');
  }
  
  /**
   * Process the notification queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    if (this.isQuietHours()) return; // Skip during quiet hours
    
    // Rate limiting
    const now = Date.now();
    if (now - this.lastSent < this.config.rateLimitMs) return;
    
    this.processing = true;
    
    // Get highest priority notification
    const notification = this.queue.sort((a, b) => {
      const priorityOrder = { urgent: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];
    
    // Remove from queue
    this.queue = this.queue.filter(n => n.id !== notification.id);
    
    try {
      await this.send(notification);
      this.lastSent = Date.now();
    } catch (err) {
      console.error('[Queue] Send failed:', err.message);
      // Re-queue if urgent
      if (notification.priority === 'urgent') {
        this.queue.unshift(notification);
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Flush all pending buffers
   */
  flushAllBuffers() {
    for (const [key, buffer] of this.buffers) {
      if (buffer.messages.length > 0) {
        this.flushBuffer(key);
      }
    }
  }
  
  /**
   * Send notification via DaNotify
   */
  async send(notification) {
    const { title, message, priority } = notification;
    
    // Build rich message
    let icon = '📢';
    if (notification.source === 'dashboard') icon = '🐙';
    if (notification.source === 'daproject') icon = '📊';
    if (notification.source === 'danotify') icon = '🔔';
    if (notification.type === 'github') icon = '🐙';
    if (notification.type === 'system') icon = '💻';
    if (notification.bundled) icon = '📦';
    
    const prefix = priority === 'urgent' ? '🔴 ' : `${icon} `;
    const fullTitle = notification.bundled ? `${prefix}${title}` : `${prefix}${title}`;
    
    await this.danotify.notify(fullTitle, message, priority);
    console.log(`[Queue] Sent: ${title}`);
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      queued: this.queue.length,
      buffers: this.buffers.size,
      lastSent: new Date(this.lastSent).toLocaleTimeString(),
      quietHours: this.isQuietHours()
    };
  }
  
  /**
   * API endpoint for external services
   */
  async apiEndpoint(req, res) {
    const { title, message, priority = 'normal', source, type } = req.body;
    
    if (!title || !message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing title or message' }));
      return;
    }
    
    const id = await this.enqueue(title, message, { priority, source, type });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, id, queued: this.queue.length }));
  }
}

export { NotificationQueue };
