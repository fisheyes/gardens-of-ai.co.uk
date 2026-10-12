#!/bin/bash
# Back up the blog source (posts, templates, assets, build script). dist/ is rebuilt, so it is skipped.
set -e
SERVICE_NAME="gardens-of-ai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
# Source: this repo. Target: <docker dir>/../backups/<service>, or set BACKUP_TARGET.
BACKUP_SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_TARGET="${BACKUP_TARGET:-$(cd "$BACKUP_SOURCE/../.." && pwd)/backups/$SERVICE_NAME}"
echo "=== Starting $SERVICE_NAME Backup ($TIMESTAMP) ==="
mkdir -p "$BACKUP_TARGET/data"
tar -czf "$BACKUP_TARGET/data/$SERVICE_NAME-$TIMESTAMP.tar.gz" -C "$BACKUP_SOURCE" --exclude=./dist .
ls -1t "$BACKUP_TARGET/data/"*.tar.gz | tail -n +31 | xargs -r rm --
echo "Backup completed successfully!"
