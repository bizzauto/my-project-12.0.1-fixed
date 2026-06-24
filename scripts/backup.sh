#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
RETENTION_DAYS=7
LOG_FILE="/var/log/bizzauto-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
log "Starting PostgreSQL backup..."
PGPASSWORD="${DB_PASSWORD:-}" pg_dump "${DATABASE_URL}" | gzip > "$BACKUP_DIR/postgres.sql.gz"

# Redis backup
log "Starting Redis backup..."
redis-cli -a "${REDIS_PASSWORD:-}" BGSAVE
sleep 5
cp /data/dump.rdb "$BACKUP_DIR/redis_dump.rdb" 2>/dev/null || log "Warning: Redis dump not found"

# Uploads backup
log "Starting uploads backup..."
tar czf "$BACKUP_DIR/uploads.tar.gz" uploads/ 2>/dev/null || log "Warning: No uploads directory"

# Compress everything
log "Compressing backup..."
tar czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

# Cleanup old backups
log "Cleaning up old backups..."
find /backups -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Backup completed: $BACKUP_DIR.tar.gz"
