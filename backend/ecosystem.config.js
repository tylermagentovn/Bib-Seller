module.exports = {
  apps: [
    {
      name: "bib-backend",
      script: "dist/index.js",
      cwd: "/var/www/Bib-Seller/backend",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
