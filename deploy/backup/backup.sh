#!/bin/sh
# CVG PostgreSQL backup loop (M06). Runs inside the postgres image (pg_dump
# and pg_restore available). Produces custom-format dumps, verifies each
# archive with `pg_restore --list`, prunes old archives, and repeats.
#
# Environment:
#   CVG_BACKUP_DATABASE_URL      required; read-capable role (migrator or a
#                                dedicated backup role with pg_read_all_data)
#   CVG_BACKUP_DIR               default /backups
#   CVG_BACKUP_INTERVAL_SECONDS  default 3600 (RPO target <= 1h, RNF-015/D-107)
#   CVG_BACKUP_RETENTION_DAYS    default 14
#   CVG_BACKUP_ONCE              "true" runs a single cycle and exits
#   CVG_BACKUP_DRY_RUN           "true" prints the plan without dumping
set -eu

BACKUP_DIR="${CVG_BACKUP_DIR:-/backups}"
INTERVAL="${CVG_BACKUP_INTERVAL_SECONDS:-3600}"
RETENTION_DAYS="${CVG_BACKUP_RETENTION_DAYS:-14}"
ONCE="${CVG_BACKUP_ONCE:-false}"
DRY_RUN="${CVG_BACKUP_DRY_RUN:-false}"

log() {
  printf '{"service":"cvg-backup","at":"%s","event":"%s"%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "${2:-}"
}

if [ -z "${CVG_BACKUP_DATABASE_URL:-}" ]; then
  log backup.config_missing ',"field":"CVG_BACKUP_DATABASE_URL"'
  exit 2
fi
case "$INTERVAL" in
  ''|*[!0-9]*) log backup.config_invalid ',"field":"CVG_BACKUP_INTERVAL_SECONDS"'; exit 2 ;;
esac
case "$RETENTION_DAYS" in
  ''|*[!0-9]*) log backup.config_invalid ',"field":"CVG_BACKUP_RETENTION_DAYS"'; exit 2 ;;
esac
mkdir -p "$BACKUP_DIR"

run_cycle() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  target="$BACKUP_DIR/cvg-$stamp.dump"
  partial="$target.partial"
  if [ "$DRY_RUN" = "true" ]; then
    log backup.plan ",\"target\":\"$target\",\"retentionDays\":$RETENTION_DAYS"
  else
    log backup.started ",\"target\":\"$target\""
    if ! pg_dump --format=custom --no-owner --no-privileges \
        --dbname="$CVG_BACKUP_DATABASE_URL" --file="$partial"; then
      log backup.failed ",\"target\":\"$target\",\"stage\":\"pg_dump\""
      rm -f "$partial"
      return 1
    fi
    if ! pg_restore --list "$partial" >/dev/null; then
      log backup.failed ",\"target\":\"$target\",\"stage\":\"verify\""
      rm -f "$partial"
      return 1
    fi
    mv "$partial" "$target"
    size="$(wc -c <"$target" | tr -d ' ')"
    log backup.completed ",\"target\":\"$target\",\"bytes\":$size"
  fi
  # Prune verified archives older than the retention window.
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'cvg-*.dump' \
    -mtime "+$RETENTION_DAYS" -print | while IFS= read -r old; do
    if [ "$DRY_RUN" = "true" ]; then
      log backup.prune_plan ",\"path\":\"$old\""
    else
      rm -f "$old"
      log backup.pruned ",\"path\":\"$old\""
    fi
  done
  return 0
}

status=0
while :; do
  if ! run_cycle; then status=1; fi
  if [ "$ONCE" = "true" ]; then exit "$status"; fi
  sleep "$INTERVAL"
done
