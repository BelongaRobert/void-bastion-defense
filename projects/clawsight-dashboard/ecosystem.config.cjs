module.exports = {
  apps: [{
    name: 'clawsight-dashboard',
    script: './src/server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    restart_delay: 3000,
    watch: false,
    max_memory_restart: '500M',
    env: { NODE_ENV: 'production' },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
};
