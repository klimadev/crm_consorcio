const instanciasConfiguradas = Number.parseInt(process.env.WEB_CONCURRENCY ?? '1', 10);
const instancias = Number.isFinite(instanciasConfiguradas) && instanciasConfiguradas > 0
  ? instanciasConfiguradas
  : 1;

module.exports = {
  apps: [
    {
      name: 'crm-consorcio',
      script: './node_modules/next/dist/bin/next',
      interpreter: 'node',
      args: 'start -p 3333 -H 0.0.0.0',
      cwd: '/var/www/crmconsorcio',
      instances: instancias,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'production',
        PORT: '3333',
        HOSTNAME: '0.0.0.0',
        NEXT_PUBLIC_DEV_PASSWORD: 'dev123',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3333',
        HOSTNAME: '0.0.0.0',
        NEXT_PUBLIC_DEV_PASSWORD: 'dev123',
      },
      max_memory_restart: '900M',
      autorestart: true,
      watch: false,
      min_uptime: '15s',
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 15000,
      instance_var: 'INSTANCE_ID',
      pmx: false,
      source_map_support: false,
      out_file: '/var/log/pm2/crm-consorcio-out.log',
      error_file: '/var/log/pm2/crm-consorcio-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
