module.exports = {
  apps: [{
    name: 'dasage-dashboard',
    script: './src/server.js',
    cwd: 'C:/Users/belon/.openclaw/workspace/projects/dasage-dashboard',
    instances: 1,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    restart_delay: 3000,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    // Hooks for notifications
    autorestart: true,
    restart_delay: 3000,
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Run script on restart
    exec_interpreter: 'node',
    exec_mode: 'fork'
  }]
};
