#!/bin/bash
# deploy.sh — pull, decrypt secrets, restart
# Run as: sudo -u ubuntu bash deploy.sh
set -euo pipefail

cd /opt/sampada

echo "==> Pulling latest..."
git pull

echo "==> Decrypting secrets..."
sops -d secrets.enc.env > /tmp/.env.secrets

# Merge secrets into .env (secrets override existing keys)
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  sed -i "/^${key}=/d" .env
  echo "${key}=${value}" >> .env
done < /tmp/.env.secrets

rm -f /tmp/.env.secrets

echo "==> Rebuilding image (if Gemfile changed)..."
docker compose build app 2>&1 | tail -3

echo "==> Running migrations..."
docker compose exec -T app bundle exec rails db:migrate 2>&1 | tail -3

echo "==> Restarting..."
docker compose restart app sidekiq

echo "==> Done."
