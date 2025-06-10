#!/bin/sh

# Automated backup script for Langfuse infrastructure
# Runs daily via cron in the backup container

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

echo "[$(date)] Starting backup process..."

# PostgreSQL Backup
echo "[$(date)] Backing up PostgreSQL database..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h postgres \
    -U langfuse \
    -d langfuse \
    -f "$BACKUP_DIR/postgres/langfuse_${TIMESTAMP}.sql" \
    --verbose \
    --no-owner \
    --no-privileges

# Compress the backup
gzip "$BACKUP_DIR/postgres/langfuse_${TIMESTAMP}.sql"

# Redis Backup (if AOF is not sufficient)
echo "[$(date)] Creating Redis snapshot..."
redis-cli -h redis -a $REDIS_PASSWORD BGSAVE
sleep 5  # Wait for background save to complete

# Copy Redis dump
cp /data/dump.rdb "$BACKUP_DIR/redis/dump_${TIMESTAMP}.rdb" || echo "Redis backup skipped"

# MinIO data backup (metadata only, as objects should be backed up separately)
echo "[$(date)] Backing up MinIO metadata..."
tar -czf "$BACKUP_DIR/minio/minio_metadata_${TIMESTAMP}.tar.gz" \
    -C /data/.minio.sys \
    . || echo "MinIO metadata backup skipped"

# Clean up old backups
echo "[$(date)] Cleaning up old backups..."
find "$BACKUP_DIR/postgres" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/redis" -name "*.rdb" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/minio" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
if [ ! -z "$BACKUP_S3_BUCKET" ]; then
    echo "[$(date)] Uploading backups to S3..."
    aws s3 sync "$BACKUP_DIR" "s3://$BACKUP_S3_BUCKET/langfuse-backups/" \
        --exclude "*.log" \
        --storage-class GLACIER
fi

echo "[$(date)] Backup completed successfully!"

# Write backup status
cat > "$BACKUP_DIR/last_backup_status.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "success",
  "postgres_backup": "langfuse_${TIMESTAMP}.sql.gz",
  "retention_days": $RETENTION_DAYS
}
EOF