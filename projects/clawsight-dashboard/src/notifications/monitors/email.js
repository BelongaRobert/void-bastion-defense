import imaps from 'imap-simple';

/**
 * Email Monitor
 * Monitors Gmail IMAP for new messages
 */

class EmailMonitor {
  constructor(notifier) {
    this.name = 'EmailMonitor';
    this.notifier = notifier;
    this.config = {
      imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: process.env.EMAIL_HOST || 'imap.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 993,
        tls: process.env.EMAIL_TLS !== 'false',
        tlsOptions: { rejectUnauthorized: false }
      }
    };
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
    this.seenUIDs = new Set();
    this.importantSenders = [
      'github.com',
      'noreply@github.com'
    ];
  }

  async start() {
    if (!this.config.imap.user || !this.config.imap.password) {
      throw new Error('Email credentials not configured');
    }

    // Initial load
    await this.loadExisting();
    
    // Start polling
    this.intervalId = setInterval(() => this.check(), this.checkInterval);
    console.log(`📧 Monitoring email: ${this.config.imap.user}`);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async loadExisting() {
    try {
      const connection = await imaps.connect(this.config);
      await connection.openBox('INBOX');
      
      // Get last 50 messages
      const searchCriteria = ['ALL'];
      const fetchOptions = { bodies: ['HEADER'], struct: true };
      const messages = await connection.search(searchCriteria, fetchOptions);
      
      for (const message of messages.slice(-50)) {
        this.seenUIDs.add(message.attributes.uid);
      }
      
      connection.end();
    } catch (err) {
      console.error('Failed to load existing emails:', err.message);
    }
  }

  async check() {
    let connection;
    try {
      connection = await imaps.connect(this.config);
      await connection.openBox('INBOX');
      
      // Search for unread messages
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { 
        bodies: ['HEADER', 'TEXT'],
        struct: true 
      };
      
      const messages = await connection.search(searchCriteria, fetchOptions);
      
      for (const message of messages) {
        const uid = message.attributes.uid;
        
        if (this.seenUIDs.has(uid)) {
          continue;
        }
        
        this.seenUIDs.add(uid);
        
        // Parse headers
        const header = message.parts.find(p => p.which === 'HEADER').body;
        const from = header.from?.[0] || 'Unknown';
        const subject = header.subject?.[0] || 'No Subject';
        
        // Check if important
        const isImportant = this.isImportantEmail(from, subject);
        
        if (isImportant) {
          this.notifier.notify(
            '📧 Important Email',
            `**From:** ${from}\n**Subject:** ${subject}\n\n_Check your inbox for details_`,
            'urgent'
          );
        }
      }
      
      connection.end();
    } catch (err) {
      console.error('Email check failed:', err.message);
      if (connection) {
        try { connection.end(); } catch (e) {}
      }
    }
  }

  isImportantEmail(from, subject) {
    const fromLower = from.toLowerCase();
    
    // Check important senders
    for (const sender of this.importantSenders) {
      if (fromLower.includes(sender)) {
        return true;
      }
    }
    
    // Check for keywords in subject
    const urgentKeywords = ['urgent', 'alert', 'error', 'failed', 'critical'];
    const subjectLower = subject.toLowerCase();
    
    for (const keyword of urgentKeywords) {
      if (subjectLower.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  async getStatus() {
    return `Monitoring: ${this.config.imap.user}`;
  }
}

export { EmailMonitor };
