#!/bin/bash
set -Eeuo pipefail

ENV_NAME="staging"
APP_DIR="/var/www/trafficmena"
BACKUP_DIR="$HOME/trafficmena_backups"
LOG_DIR="$APP_DIR/deployment-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/deploy-${ENV_NAME}-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  local failed_cmd="$3"
log "ERROR: exit $exit_code at line $line_no: $failed_cmd"
log "ERROR: deployment aborted; existing services left running."
  exit "$exit_code"
}

trap 'on_error $? $LINENO "$BASH_COMMAND"' ERR

log "Starting deployment (env=$ENV_NAME)"
log "App dir: $APP_DIR"

if [ ! -f "$APP_DIR/server/.env" ]; then
log "ERROR: .env file missing at $APP_DIR/server/.env"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
log "Backing up .env file..."
cp "$APP_DIR/server/.env" "$BACKUP_DIR/.env.backup_$TIMESTAMP"
log "Backup created at $BACKUP_DIR/.env.backup_$TIMESTAMP"

cd "$APP_DIR"

log "Adjusting permissions..."
current_user="$(id -un)"
current_group="$(id -gn)"
sudo chown "$current_user:$current_group" server/.env
chmod 600 server/.env

log "Running DB config check..."
"$APP_DIR/check-db-config.sh"

current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
log "ERROR: expected branch main, found $current_branch"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
log "ERROR: working tree is dirty; aborting to avoid overwriting local changes."
  exit 1
fi

log "Fetching latest code..."
git fetch origin main
log "Merging origin/main..."
git merge --ff-only origin/main

log "Deploying commit: $(git rev-parse HEAD)"

log "Installing root dependencies..."
npm install

log "Installing backend dependencies and building server..."
cd server
npm install
npm run build
cd ..

log "Running database migrations..."
npm --prefix server run db:migrate

log "Building frontend..."
npm run build

log "Restarting services..."
sudo systemctl restart trafficmena
sudo systemctl restart caddy

log "Checking status..."
sudo systemctl status trafficmena --no-pager
sudo systemctl status caddy --no-pager

log "Deployment complete."
