#!/usr/bin/env sh
# Reports i18n translation coverage per locale against the extracted source.
# Translations are matched by trans-unit id (source of truth: messages.xlf).
#
# Usage: sh scripts/i18n-coverage.sh
# (or: npm run i18n:coverage)
set -e
cd "$(dirname "$0")/.."

SRC=src/locales/messages.xlf

ids_sorted() {
  grep -o 'trans-unit id="[0-9]*"' "$1" | tr -d '"' | sed 's/trans-unit id=//' | sort -u
}

ids_sorted "$SRC" > /tmp/i18n_src_ids
TOTAL=$(wc -l < /tmp/i18n_src_ids | tr -d ' ')

printf 'Source messages (en): %s\n\n' "$TOTAL"

for L in pt es; do
  F="src/locales/messages.$L.xlf"
  [ -f "$F" ] || continue
  ids_sorted "$F" > /tmp/i18n_loc_ids
  comm -12 /tmp/i18n_src_ids /tmp/i18n_loc_ids > /tmp/i18n_ok
  OK=$(wc -l < /tmp/i18n_ok | tr -d ' ')
  comm -23 /tmp/i18n_src_ids /tmp/i18n_ok > /tmp/i18n_missing
  MISS=$(wc -l < /tmp/i18n_missing | tr -d ' ')
  PCT=$(awk -v ok="$OK" -v tot="$TOTAL" 'BEGIN { printf "%.1f", tot ? ok * 100 / tot : 0 }')
  printf '%s: %s/%s traduzidas (%s%%)\n' "$L" "$OK" "$TOTAL" "$PCT"
  if [ "$MISS" -gt 0 ]; then
    printf '  Faltando (%s):\n' "$MISS"
    awk '
      NR == FNR { miss[$1] = 1; next }
      /<trans-unit id="/ {
        id = $0
        sub(/.*<trans-unit id="/, "", id)
        sub(/".*/, "", id)
        want = 1
        next
      }
      want && /<source>/ {
        t = $0
        sub(/.*<source>/, "", t)
        sub(/<\/source>.*/, "", t)
        gsub(/<[^>]*>/, "", t)
        gsub(/&amp;/, "&", t)
        gsub(/&lt;/, "<", t)
        gsub(/&gt;/, ">", t)
        if (id in miss) printf "     %s :: %s\n", id, t
        want = 0
      }
    ' /tmp/i18n_missing "$SRC"
  fi
  printf '\n'
done
