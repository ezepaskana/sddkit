#!/bin/sh
# Verificación del paso 6 (tarea 025): desglose estimado + overhead fijo.
#
# Arma repos de mentira en directorios temporales (con `debug_log` prendido) y
# corre `hooks/debug-context.sh` con payloads y transcripts sintéticos cuyos
# números se pueden calcular a mano:
#
#   arranque exacto  = 0 + 0 + 100000            = 100000 tokens
#   brief            = 60 bytes / 4              =     15 tokens (estimado)
#   archivo nombrado = 400 bytes / 4             =    100 tokens (estimado)
#   subtotal piezas                              =    115 tokens
#   overhead fijo    = 100000 - 115              =  99885 tokens
#
# Comprueba además que el overhead sea de verdad la resta (y no un número
# inventado), que ningún renglón estimado se presente como exacto, que un
# overhead negativo se reporte como 0, y que con campos ausentes el script
# termine en 0 sin escribir nada (CA-6, CA-8, CA-9). Sale 0 solo si todo da;
# ≠ 0 con el motivo por stderr.
#
# POSIX sh + grep/sed/awk/wc. Sin jq, Node ni Python (BR-079).

set -u

# El hook cae al plugin instalado si esta variable está seteada; acá queremos
# medir los .md del repo de trabajo, así que la sacamos del ambiente.
unset CLAUDE_PLUGIN_ROOT 2>/dev/null || true

aqui=$(cd "$(dirname "$0")" && pwd)
raiz=$(cd "$aqui/../../../.." && pwd)
script="$raiz/hooks/debug-context.sh"

fallas=0
falla() { fallas=$((fallas + 1)); printf '%s\n' "FALLA: $*" >&2; }

test -f "$script" || { falla "no existe $script"; exit 1; }

tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT INT TERM

# Corre el hook desde el repo de mentira $1 con el payload $2, dejando su
# stdout+stderr juntos en $tmp/salida.txt. El cwd nunca es el repo real.
correr() {
  ( cd "$1" && sh "$script" < "$2" ) > "$tmp/salida.txt" 2>&1
}

# Renglones del desglose (los que dicen "aprox. N tokens"), el subtotal y el
# overhead, leídos del archivo generado. Imprime "suma subtotal overhead", con
# -1 en el overhead cuando el renglón no está.
leer_desglose() {
  awk '
    /^## Desglose/ { en = 1; next }
    /^## /         { en = 0 }
    en && /aprox\. [0-9]+ tokens$/ { v = $0; sub(/.*aprox\. /, "", v); suma += v + 0 }
    en && /^- Subtotal/            { v = $0; sub(/.*: /, "", v); sub_t = v + 0; hay_sub = 1 }
    en && /^- overhead fijo/       { v = $0; sub(/.*: /, "", v); over = v + 0; hay_over = 1 }
    END {
      printf "%d %d %d\n", suma, (hay_sub ? sub_t : -1), (hay_over ? over : -1)
    }
  ' "$1"
}

# Todo renglón del desglose tiene que declararse estimado: si uno se presenta
# como exacto, el archivo miente sobre lo que mide (CA-6, S-3).
sin_renglon_exacto() {
  awk '
    /^## Desglose/ { en = 1; next }
    /^## /         { en = 0 }
    en && /^- / && $0 !~ /estimad/ { print; malo = 1 }
    END { exit (malo ? 1 : 0) }
  ' "$1"
}

# --- repo de mentira base -----------------------------------------------------
repo="$tmp/repo"
mkdir -p "$repo/.sdd" "$repo/hooks" || exit 1
printf '%s\n' '{"debug_log": true}' > "$repo/.sdd/config.json"

# Archivo que el brief nombra: exactamente 400 bytes -> 100 tokens estimados.
awk 'BEGIN { for (i = 0; i < 400; i++) printf "x" }' > "$repo/hooks/objetivo.sh"
tam=$(wc -c < "$repo/hooks/objetivo.sh" | awk '{ print $1 + 0 }')
test "$tam" -eq 400 || falla "el archivo nombrado mide $tam bytes, se esperaban 400"

# Transcript sintético: arranque exacto = 0 + 0 + 100000 = 100000.
printf '%s\n' '{"type":"assistant","message":{"model":"claude-opus-5","usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":100000,"output_tokens":1}}}' > "$repo/grande.jsonl"
# Transcript flaco: arranque exacto = 10, menos que las piezas estimadas.
printf '%s\n' '{"type":"assistant","message":{"model":"claude-opus-5","usage":{"input_tokens":10,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":1}}}' > "$repo/flaco.jsonl"

# Brief sin comillas ni escapes: sus bytes en el JSON son los del texto plano.
brief='Ejecuta el paso y toca hooks/objetivo.sh sin tocar nada mas.'
brief_bytes=$(printf '%s' "$brief" | wc -c | awk '{ print $1 + 0 }')
test "$brief_bytes" -eq 60 || falla "el brief mide $brief_bytes bytes, se esperaban 60"

payload_task() { # $1=transcript $2=prompt (vacío = sin campo prompt) $3=destino
  if test -n "$2"; then
    printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"PreToolUse","tool_name":"Task","tool_input":{"description":"paso 6","subagent_type":"general-purpose","model":"sonnet","prompt":"%s"},"tool_use_id":"toolu_CHK"}\n' "$1" "$2" > "$3"
  else
    printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"PreToolUse","tool_name":"Task","tool_input":{"description":"paso 6","subagent_type":"general-purpose","model":"sonnet"},"tool_use_id":"toolu_CHK"}\n' "$1" > "$3"
  fi
}

sub_inicio="$repo/.sdd/debug/subagente-toolu_CHK-inicio.md"

# --- caso 1: subagente, números calculados a mano ------------------------------
rm -rf "$repo/.sdd/debug"
payload_task "$repo/grande.jsonl" "$brief" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 1 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 1 escribió en la salida: $(cat "$tmp/salida.txt")"

if test -f "$sub_inicio"; then
  grep -q '^- Brief del paso (estimado): 60 bytes, aprox\. 15 tokens$' "$sub_inicio" ||
    falla "no está el renglón del brief con 60 bytes / 15 tokens: $(grep -i brief "$sub_inicio")"
  grep -q '^- Archivo nombrado hooks/objetivo\.sh (estimado): 400 bytes, aprox\. 100 tokens$' "$sub_inicio" ||
    falla "no está el renglón del archivo nombrado: $(grep -i nombrado "$sub_inicio")"
  grep -q '^- Subtotal piezas propias (estimado): 115 tokens$' "$sub_inicio" ||
    falla "el subtotal no es 115: $(grep -i subtotal "$sub_inicio")"
  grep -q 'overhead fijo' "$sub_inicio" ||
    falla "falta el renglón literal 'overhead fijo'"
  grep -q '^- overhead fijo (estimado por resta: total exacto 100000 menos piezas estimadas 115): 99885 tokens$' "$sub_inicio" ||
    falla "el overhead no es la resta 100000-115=99885: $(grep -i overhead "$sub_inicio")"
  grep -q '^- Modelo' "$sub_inicio" && test "$(grep -c '^- Modelo' "$sub_inicio")" -gt 1 &&
    falla "el renglón de modelo está duplicado"

  sin_renglon_exacto "$sub_inicio" ||
    falla "hay renglones del desglose que no se declaran estimados"

  # El overhead tiene que ser la resta, no un número puesto a mano.
  set -- $(leer_desglose "$sub_inicio")
  test "$1" -eq "$2" || falla "la suma de las piezas ($1) no coincide con el subtotal ($2)"
  test "$3" -eq $((100000 - $2)) ||
    falla "el overhead ($3) no es arranque(100000) - subtotal($2) = $((100000 - $2))"

  # El desglose no puede pisar la sección exacta del paso 5.
  grep -q '^- Contexto de arranque: 100000 tokens' "$sub_inicio" ||
    falla "se perdió el total exacto del paso 5"
else
  falla "no se escribió $sub_inicio"
fi

# --- caso 2: overhead negativo -> 0, nunca un número negativo -----------------
rm -rf "$repo/.sdd/debug"
payload_task "$repo/flaco.jsonl" "$brief" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 2 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 2 escribió en la salida"

if test -f "$sub_inicio"; then
  grep -q '^- overhead fijo (estimado por resta): 0 tokens' "$sub_inicio" ||
    falla "con la estimación por encima del total el overhead no dio 0: $(grep -i overhead "$sub_inicio")"
  grep -i overhead "$sub_inicio" | grep -qE '(^|[^0-9])-[0-9]+' &&
    falla "el overhead reporta un número negativo"
  grep -i overhead "$sub_inicio" | grep -q 'excedió' ||
    falla "no se aclara que la estimación excedió al total"
else
  falla "caso 2: no se escribió $sub_inicio"
fi

# --- caso 3: sin transcript -> piezas sí, overhead no (CA-8) ------------------
rm -rf "$repo/.sdd/debug"
payload_task "$repo/no-existe.jsonl" "$brief" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 3 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 3 escribió en la salida"

if test -f "$sub_inicio"; then
  grep -q '^- Brief del paso (estimado): 60 bytes' "$sub_inicio" ||
    falla "caso 3: sin transcript igual tendría que medir el brief"
  grep -q 'overhead fijo' "$sub_inicio" &&
    falla "caso 3: sin total exacto no se puede restar, no debería haber overhead"
else
  falla "caso 3: no se escribió $sub_inicio"
fi

# --- caso 4: campos ausentes -> silencio, sin desglose (CA-8, CA-9) -----------
rm -rf "$repo/.sdd/debug"
payload_task "$repo/grande.jsonl" "" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 4 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 4 escribió en la salida: $(cat "$tmp/salida.txt")"
if test -f "$sub_inicio"; then
  grep -q 'Desglose' "$sub_inicio" &&
    falla "caso 4: sin brief ni archivos no debería haber desglose"
  grep -q 'overhead fijo' "$sub_inicio" &&
    falla "caso 4: sin piezas no debería haber overhead"
fi

# --- caso 5: brief que nombra archivos inexistentes ---------------------------
rm -rf "$repo/.sdd/debug"
payload_task "$repo/grande.jsonl" "Toca hooks/fantasma.sh y .sdd/no/hay.md nada mas." "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 5 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 5 escribió en la salida"
if test -f "$sub_inicio"; then
  grep -q 'fantasma' "$sub_inicio" &&
    falla "caso 5: nombró un archivo que no existe"
  grep -q '^- Brief del paso (estimado)' "$sub_inicio" ||
    falla "caso 5: igual tendría que medir el brief"
fi

# --- caso 6: agente principal con tarea in-progress ---------------------------
repo2="$tmp/repo2"
mkdir -p "$repo2/.sdd/tasks/t1" || exit 1
printf '%s\n' '{"debug_log": true}' > "$repo2/.sdd/config.json"
printf '%s\n' 'Convenciones del repo de mentira.' > "$repo2/CLAUDE.md"
printf '%s\n' 'plan' > "$repo2/.sdd/tasks/t1/plan.md"
printf '%s\n' 'spec' > "$repo2/.sdd/tasks/t1/spec.md"
cp "$repo/grande.jsonl" "$repo2/grande.jsonl"
cat > "$repo2/.sdd/tasks/index.json" <<'FIN'
{
  "tasks": [
    {
      "dir": "t1",
      "status": "in-progress"
    }
  ]
}
FIN
printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"SessionStart","source":"startup"}\n' \
  "$repo2/grande.jsonl" > "$tmp/payload.json"
correr "$repo2" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 6 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 6 escribió en la salida: $(cat "$tmp/salida.txt")"

prin="$repo2/.sdd/tasks/t1/debug/principal-inicio.md"
if test -f "$prin"; then
  grep -q '^- CLAUDE\.md (estimado): [0-9]* bytes, aprox\. [0-9]* tokens$' "$prin" ||
    falla "caso 6: no mide CLAUDE.md"
  grep -q '^- Hook caveman\.md (estimado): [0-9]* bytes' "$prin" ||
    falla "caso 6: no mide el .md que vuelca el hook de caveman"
  grep -q '^- Artefacto plan\.md (estimado): [0-9]* bytes' "$prin" ||
    falla "caso 6: no mide el plan.md de la tarea en curso"
  grep -q '^- Artefacto spec\.md (estimado): [0-9]* bytes' "$prin" ||
    falla "caso 6: no mide el spec.md de la tarea en curso"
  grep -q 'Artefacto requirement' "$prin" &&
    falla "caso 6: nombró requirement.md, que no existe"
  grep -q 'overhead fijo' "$prin" ||
    falla "caso 6: falta el renglón de overhead fijo"
  sin_renglon_exacto "$prin" ||
    falla "caso 6: hay renglones del desglose que no se declaran estimados"

  set -- $(leer_desglose "$prin")
  test "$1" -eq "$2" || falla "caso 6: la suma de las piezas ($1) no da el subtotal ($2)"
  test "$3" -eq $((100000 - $2)) ||
    falla "caso 6: el overhead ($3) no es 100000 - $2"
else
  falla "caso 6: no se escribió $prin"
fi

# --- caso 7: el fin no lleva desglose (el arranque ya está explicado) ---------
printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"SessionEnd","reason":"exit"}\n' \
  "$repo2/grande.jsonl" > "$tmp/payload.json"
correr "$repo2" "$tmp/payload.json"
rc=$?
test "$rc" -eq 0 || falla "caso 7 salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "caso 7 escribió en la salida"

test "$fallas" -eq 0 || exit 1
exit 0
