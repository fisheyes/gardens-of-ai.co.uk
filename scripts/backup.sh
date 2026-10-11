#!/bin/bash
# Back up the blog source (posts, templates, assets, build script). dist/ is rebuilt, so it is skipped.
set -e
SERVICE_NAME="gardens-of-ai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_SOURCE="/mnt/nas/docker/$SERVICE_NAME"
BACKUP_TARGET="/mnt/nas/backups/$SERVICE_NAME"
echo "=== Starting $SERVICE_NAME Backup ($TIMESTAMP) ==="
mkdir -p "$BACKUP_TARGET/data"
tar -czf "$BACKUP_TARGET/data/$SERVICE_NAME-$TIMESTAMP.tar.gz" -C "$BACKUP_SOURCE" --exclude=./dist .
ls -1t "$BACKUP_TARGET/data/"*.tar.gz | tail -n +31 | xargs -r rm --
echo "Backup completed successfully!"
