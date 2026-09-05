#!/bin/bash
# deploy.sh — pull, decrypt secrets, converge containers
# Run as: sudo -u ubuntu bash deploy.sh
set -euo pipefail

cd /opt/sampada

echo "==> Pulling latest..."
git pull

echo "==> Decrypting secrets..."
sops -d secrets.enc.env > /tmp/.env.secrets

# Merge sops secrets into .env WITHOUT in-place sed (CFG-05). Net result is
# identical to the old loop — base .env minus overridden keys, secrets appended
# last — but the merge is robust to '=' and regex-special characters in values
# (awk splits on the first '=' only; keys are matched literally, never fed to a
# regex) and atomic (temp file + mv, so a partial write can't leave .env torn).
# NOTE: we deliberately keep pushing secrets into .env rather than only passing
# --env-file to the compose CLI: --env-file feeds compose-file interpolation
# only, NOT the service env_file contents, so the containers would never see
# the secrets otherwise.
awk -F= 'NR==FNR { if ($0 ~ /^[A-Za-z_][A-Za-z0-9_]*=/) k[$1]=1; next }
         { h=$0; sub(/=.*/, "", h); if (!(h in k)) print }' /tmp/.env.secrets .env > /tmp/.env.merged
cat /tmp/.env.secrets >> /tmp/.env.merged
mv /tmp/.env.merged .env
rm -f /tmp/.env.secrets

echo "==> Rebuilding image (if Gemfile changed)..."
docker compose build app 2>&1 | tail -3

echo "==> Running migrations..."
docker compose exec -T app bundle exec rails db:migrate 2>&1 | tail -3

echo "==> Converging services (recreates only when config/env changed)..."
docker compose up -d

echo "==> Done."
