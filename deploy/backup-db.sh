#!/usr/bin/env bash
# Sao lưu PostgreSQL (chạy pg_dump trong container, nén gzip, giữ 7 bản mới nhất).
# Dùng cho cron hằng ngày. Khôi phục: xem hướng dẫn ở cuối file.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"          # thư mục chứa docker-compose.yml
BACKUP_DIR="${BACKUP_DIR:-${HOME:-/home/deploy}/db-backups}"
KEEP=7

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/tour_db_${STAMP}.sql.gz"

# pg_dump đọc credential từ chính env của container postgres → không hardcode mật khẩu.
docker compose exec -T postgres \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip > "$FILE"

# Chỉ giữ $KEEP bản mới nhất, xoá bản cũ hơn.
ls -1t "$BACKUP_DIR"/tour_db_*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "[$(date '+%Y-%m-%d %H:%M:%S')] backup OK -> $FILE ($(du -h "$FILE" | cut -f1))"

# ── KHÔI PHỤC (chạy thủ công khi cần) ─────────────────────────────────────────
# cd ~/azure-horizon-tour
# gunzip -c ~/db-backups/tour_db_YYYYMMDD_HHMMSS.sql.gz \
#   | docker compose exec -T postgres \
#       sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
