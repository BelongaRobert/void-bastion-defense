import { Octokit } from '@octokit/rest';

/**
 * GitHub Monitor
 * Tracks: Issues, PRs, mentions for specified repos
 */

class GitHubMonitor {
  constructor(notifier) {
    this.name = 'GitHubMonitor';
    this.notifier = notifier;
    this.token = process.env.GITHUB_TOKEN;
    this.username = process.env.GITHUB_USERNAME;
    this.repos = (process.env.GITHUB_REPOS || '').split(',').filter(Boolean);
    this.checkInterval = 10 * 60 * 1000; // 10 minutes
    this.intervalId = null;
    this.seenIssues = new Set();
    this.seenPRs = new Set();
    
    // Initialize Octokit immediately if token available
    if (this.token) {
      this.octokit = new Octokit({ auth: this.token });
    }
  }

  async start() {
    if (!this.token) {
      throw new Error('GitHub token not configured');
    }

    this.octokit = new Octokit({ auth: this.token });
    
    // Initial load - mark existing as seen
    await this.loadExisting();
    
    // Start polling
    this.intervalId = setInterval(() => this.check(), this.checkInterval);
    console.log(`🔍 Monitoring GitHub: ${this.repos.join(', ')}`);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async loadExisting() {
    for (const repo of this.repos) {
      try {
        const [owner, name] = repo.includes('/') ? repo.split('/') : [this.username, repo];
        
        // Get open issues
        const { data: issues } = await this.octokit.issues.listForRepo({
          owner,
          repo: name,
          state: 'open'
        });
        
        for (const issue of issues) {
          this.seenIssues.add(issue.id);
        }

        // Get open PRs
        const { data: pulls } = await this.octokit.pulls.list({
          owner,
          repo: name,
          state: 'open'
        });
        
        for (const pr of pulls) {
          this.seenPRs.add(pr.id);
        }
      } catch (err) {
        console.error(`Failed to load ${repo}:`, err.message);
      }
    }
  }

  async check() {
    for (const repo of this.repos) {
      try {
        const [owner, name] = repo.includes('/') ? repo.split('/') : [this.username, repo];
        
        await this.checkIssues(owner, name);
        await this.checkPRs(owner, name);
        await this.checkMentions();
      } catch (err) {
        console.error(`Check failed for ${repo}:`, err.message);
      }
    }
  }

  async checkIssues(owner, repo) {
    const { data: issues } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });

    for (const issue of issues) {
      if (!this.seenIssues.has(issue.id)) {
        this.seenIssues.add(issue.id);
        
        if (!issue.pull_request) {
          this.notifier.notify(
            '🐙 New Issue',
            `[${owner}/${repo}]\n\n**${issue.title}**\n#${issue.number} by @${issue.user.login}\n\n${issue.html_url}`
          );
        }
      }
    }
  }

  async checkPRs(owner, repo) {
    const { data: pulls } = await this.octokit.pulls.list({
      owner,
      repo,
      state: 'open'
    });

    for (const pr of pulls) {
      if (!this.seenPRs.has(pr.id)) {
        this.seenPRs.add(pr.id);
        
        this.notifier.notify(
          '🔀 New Pull Request',
          `[${owner}/${repo}]\n\n**${pr.title}**\n#${pr.number} by @${pr.user.login}\n\n${pr.html_url}`
        );
      }
    }
  }

  async checkMentions() {
    // Check for notifications mentioning user
    try {
      const { data: notifications } = await this.octokit.activity.listNotificationsForAuthenticatedUser({
        since: new Date(Date.now() - this.checkInterval).toISOString()
      });

      for (const notif of notifications) {
        if (notif.reason === 'mention' || notif.reason === 'team_mention') {
          this.notifier.notify(
            '📣 GitHub Mention',
            `You were mentioned in:\n\n**${notif.subject.title}**\n${notif.repository.full_name}\n\n${notif.subject.url}`
          );
          
          // Mark as read
          await this.octokit.activity.markThreadAsRead({ thread_id: notif.id });
        }
      }
    } catch (err) {
      console.error('Mentions check failed:', err.message);
    }
  }

  async getStatus() {
    return `${this.repos.length} repos monitored`;
  }
}

export { GitHubMonitor };
