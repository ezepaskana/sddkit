#!/bin/sh
# PROBE TEMPORAL (tarea 025, paso 2) — vuelca stdin crudo para inspeccionar el
# formato real de los payloads de hooks. Se borra en el paso 8 junto con su
# cableado en hooks.json.
{
  event="${1:-unknown}"
  dir=".sdd/debug/probe"
  ts=$(date +%Y%m%d%H%M%S)
  mkdir -p "$dir"
  cat > "$dir/${event}-${ts}.json"
} 2>/dev/null 1>&2
exit 0
