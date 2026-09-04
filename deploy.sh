#!/bin/bash
# deploy.sh — pull, decrypt secrets, restart
set -euo pipefail

cd /opt/sampada

echo "==> Pulling latest..."
sudo git pull

echo "==> Decrypting secrets..."
sops -d secrets.enc.env | sudo tee .env.secrets > /dev/null

# Merge secrets into .env (secrets override existing keys)
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  # Remove existing key from .env, then append
  sudo sed -i "/^${key}=/d" .env
  echo "${key}=${value}" | sudo tee -a .env > /dev/null
done < .env.secrets

rm -f .env.secrets

echo "==> Rebuilding image (if Gemfile changed)..."
sudo docker compose build app 2>&1 | tail -3

echo "==> Running migrations..."
sudo docker compose exec -T app bundle exec rails db:migrate 2>&1 | tail -3

echo "==> Restarting..."
sudo docker compose restart app sidekiq

echo "==> Done."
