#!/bin/bash
set -Eeuo pipefail

# ============================================================
# TrafficMENA Production Deployment Script
# ============================================================
# Usage:
#   ./deploy-prod.sh              # Interactive mode (requires confirmation)
#   ./deploy-prod.sh --auto       # Automated mode (for CI/CD webhooks)
# ============================================================

ENV_NAME="production"
APP_DIR="/var/www/trafficmena"
BACKUP_DIR="$HOME/trafficmena_backups"
DB_BACKUP_DIR="$HOME/backups/postgres"
LOG_DIR="$APP_DIR/deployment-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/deploy-${ENV_NAME}-${TIMESTAMP}.log"

# Database configuration (matches backup-database.sh)
DB_NAME="trafficmena_prod"
DB_USER="trafficmena_admin"
DB_PASSWORD="71Z5QbdcTLWZ0aSbhVWA"

# Parse arguments
AUTO_MODE=false
if [[ "${1:-}" == "--auto" ]]; then
    AUTO_MODE=true
fi

mkdir -p "$LOG_DIR" "$BACKUP_DIR" "$DB_BACKUP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

on_error() {
    local exit_code="$1"
    local line_no="$2"
    local failed_cmd="$3"
    log "❌ ERROR: exit $exit_code at line $line_no: $failed_cmd"
    log "❌ ERROR: deployment aborted; existing services left running."
    log ""
    log "💾 RECOVERY OPTIONS:"
    log "   1. Restore database: gunzip -c $DB_BACKUP_DIR/trafficmena_${TIMESTAMP}.sql.gz | PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME"
    log "   2. Rollback code: git -C $APP_DIR checkout <previous-commit>"
    log "   3. Check logs: tail -100 $LOG_FILE"
    exit "$exit_code"
}

trap 'on_error $? $LINENO "$BASH_COMMAND"' ERR

backup_database() {
    log "🗄️  Creating database backup before deployment..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        log "⚠️  PostgreSQL is not running. Starting..."
        sudo systemctl start postgresql@17-main
        sleep 2
        
        if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
            log "❌ Failed to start PostgreSQL"
            return 1
        fi
        log "✅ PostgreSQL started successfully"
    fi
    
    local backup_file="${DB_BACKUP_DIR}/trafficmena_${TIMESTAMP}.sql.gz"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h localhost \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        2>&1 | gzip > "$backup_file"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log "✅ Database backup successful: $backup_file ($backup_size)"
        
        # Cleanup old backups (keep 30 days)
        find "$DB_BACKUP_DIR" -name "trafficmena_*.sql.gz" -mtime +30 -type f -delete
        return 0
    else
        log "❌ Database backup failed!"
        return 1
    fi
}

check_api_health() {
    log "🏥 Checking API health..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
            log "✅ API health check passed (attempt $attempt/$max_attempts)"
            return 0
        fi
        log "   Waiting for API to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log "❌ API health check failed after $max_attempts attempts"
    return 1
}

# ============================================================
# DEPLOYMENT START
# ============================================================

log "=========================================="
log "🚀 Starting deployment (env=$ENV_NAME)"
log "   App dir: $APP_DIR"
log "   Log file: $LOG_FILE"
log "   Auto mode: $AUTO_MODE"
log "=========================================="

# Production confirmation (skip in auto mode)
if [ "$AUTO_MODE" = false ]; then
    read -r -p "⚠️  Type PRODUCTION to continue: " confirmation
    if [ "$confirmation" != "PRODUCTION" ]; then
        log "❌ ERROR: confirmation failed. Aborting."
        exit 1
    fi
    log "✅ Production confirmation accepted."
fi

# Validate .env file exists
if [ ! -f "$APP_DIR/server/.env" ]; then
    log "❌ ERROR: .env file missing at $APP_DIR/server/.env"
    exit 1
fi

# Backup .env file
log "💾 Backing up .env file..."
cp "$APP_DIR/server/.env" "$BACKUP_DIR/.env.backup_$TIMESTAMP"
log "✅ .env backup created at $BACKUP_DIR/.env.backup_$TIMESTAMP"

cd "$APP_DIR"

# Fix permissions
log "🔑 Adjusting permissions..."
current_user="$(id -un)"
current_group="$(id -gn)"
sudo chown "$current_user:$current_group" server/.env
chmod 600 server/.env

# Run DB config check
log "🔍 Running DB config check..."
if [ -f "$HOME/check-db-config.sh" ]; then
    bash "$HOME/check-db-config.sh" || log "⚠️  DB config check had warnings"
else
    log "⚠️  check-db-config.sh not found in $HOME, skipping..."
fi

# Git checks
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    log "❌ ERROR: expected branch main, found $current_branch"
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    log "❌ ERROR: working tree is dirty; aborting to avoid overwriting local changes."
    log "   Run 'git status' to see uncommitted changes."
    exit 1
fi

# Fetch and merge latest code
log "📥 Fetching latest code from origin..."
git fetch origin main

local_head=$(git rev-parse HEAD)
remote_head=$(git rev-parse origin/main)

if [ "$local_head" = "$remote_head" ]; then
    log "ℹ️  Already up to date with origin/main"
else
    log "📥 Merging origin/main..."
    git merge --ff-only origin/main
fi

current_commit=$(git rev-parse HEAD)
short_commit=$(git rev-parse --short HEAD)
commit_msg=$(git log -1 --pretty=%B | head -1)
log "📦 Deploying commit: $short_commit - $commit_msg"

# Install dependencies
log "📦 Installing root dependencies..."
npm ci --silent

log "⚙️  Installing backend dependencies..."
cd server
npm ci --silent

log "🔨 Building server..."
npm run build
cd ..

# CRITICAL: Backup database before migrations
backup_database

# Run migrations with error handling
log "🗄️  Running database migrations..."
if npm --prefix server run db:migrate; then
    log "✅ Migrations completed successfully"
else
    log "❌ MIGRATION FAILED! Deployment aborted."
    log ""
    log "💾 RESTORE DATABASE FROM: $DB_BACKUP_DIR/trafficmena_${TIMESTAMP}.sql.gz"
    log "   gunzip -c $DB_BACKUP_DIR/trafficmena_${TIMESTAMP}.sql.gz | PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME"
    log ""
    log "🔄 ROLLBACK CODE: git checkout $local_head"
    exit 1
fi

# Build frontend
log "🏗️  Building frontend..."
npm run build

# Restart services
log "🔄 Restarting services..."
sudo systemctl restart trafficmena
sleep 3

log "📊 Service status:"
sudo systemctl status trafficmena --no-pager || true
sudo systemctl status caddy --no-pager || true

# Health check
check_api_health

# Final summary
log ""
log "=========================================="
log "✅ DEPLOYMENT COMPLETE"
log "   Commit: $short_commit"
log "   Time: $(date)"
log "   Log: $LOG_FILE"
log "   DB Backup: $DB_BACKUP_DIR/trafficmena_${TIMESTAMP}.sql.gz"
log "=========================================="
