module.exports = {
  apps: [{
    name: 'bitcoin-center-seoul',
    script: 'server.js',
    cwd: '/var/www/bitcoin-center-seoul',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/bitcoin-center-seoul-error.log',
    out_file: '/var/log/pm2/bitcoin-center-seoul-out.log',
    log_file: '/var/log/pm2/bitcoin-center-seoul.log',
    time: true
  }]
};
