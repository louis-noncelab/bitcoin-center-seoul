// Review-only template. Use a dedicated unprivileged service account and Node 24.
// Resolve these paths on the target host only during an approved manual release.
module.exports = {
  apps: [{
    name: "bitcoin-center-seoul-web",
    cwd: "/srv/bitcoin-center-seoul/current/web",
    script: ".next/standalone/web/server.js",
    interpreter: "/usr/bin/node",
    node_args: "--env-file=/etc/bitcoin-center-seoul/admin-password.env",
    instances: 1,
    exec_mode: "fork",
    watch: false,
    autorestart: true,
    min_uptime: "10s",
    max_restarts: 10,
    restart_delay: 2000,
    kill_timeout: 10000,
    merge_logs: true,
    out_file: "/var/log/bitcoin-center-seoul/web-out.log",
    error_file: "/var/log/bitcoin-center-seoul/web-error.log",
    env: {
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: "3100",
      APP_ORIGIN: "https://center.example.invalid",
      BCS_EVENTS_DB: "/var/lib/bitcoin-center-seoul/events.db",
      BCS_EVENTS_UPLOADS: "/var/lib/bitcoin-center-seoul/images",
      BCS_TRUST_PROXY: "true",
      __NEXT_PROCESSED_ENV: "true",
    },
  }],
};
