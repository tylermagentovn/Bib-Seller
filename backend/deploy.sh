#!/bin/bash
set -e

DEPLOY_DIR="/var/www/Bib-Seller"

echo "==> Pulling latest code..."
cd "$DEPLOY_DIR"
git pull origin main

echo "==> Installing dependencies..."
cd "$DEPLOY_DIR/backend"
npm ci --omit=dev

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running migrations..."
npx prisma migrate deploy

echo "==> Building..."
npm run build

echo "==> Restarting PM2..."
pm2 restart bib-backend || pm2 start ecosystem.config.js

echo "==> Done!"
pm2 status bib-backend
