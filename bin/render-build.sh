#!/usr/bin/env bash
# ****************************************************************************
#  UNSUPPORTED / RETIRED — do not use for new deployments.
#
#  Render.com (buildpack-style) hosting was dropped 2026-06-12 during the
#  DPDP compliance overhaul (US-hosted infra retired; see docs/CONTEXT.md).
#  This script is kept only for reference. It is NOT maintained, NOT exercised
#  in CI, and its assumptions about asset compilation / process management are
#  no longer validated against the current app.
#
#  The single supported deployment path is `deploy.sh` + `docker-compose.yml`
#  (self-hosted, secrets via sops in `secrets.enc.env`).
# ****************************************************************************
set -o errexit

echo "Installing gems..."
bundle install

echo "Clobbering old assets..."
bundle exec rails assets:clobber

echo "Precompiling assets for production..."
bundle exec rails assets:precompile

echo "✅ Build complete"