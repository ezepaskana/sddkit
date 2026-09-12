#!/bin/sh
# Verificación del paso 5 (tarea 025): totales exactos del transcript.
#
# Arma un repo de mentira en un directorio temporal (con `debug_log` prendido y
# sin `index.json`, así el destino es `.sdd/debug/`), corre `hooks/debug-context.sh`
# con los payloads de fixture y comprueba que los números que salen son los que
# el transcript sintético dice:
#
#   arranque = 5 + 1000 + 60000 = 61005
#   cierre   = 2 +  500 + 90000 = 90502
#   crecimiento                 = 29497
#
# También comprueba el silencio absoluto (CA-8, CA-9) y la degradación cuando el
# transcript no existe. Sale 0 solo si todo da; ≠ 0 con el motivo por stderr.
#
# POSIX sh + grep/sed/awk. Sin jq, Node ni Python (BR-079).

set -u

aqui=$(cd "$(dirname "$0")" && pwd)
raiz=$(cd "$aqui/../../../.." && pwd)
script="$raiz/hooks/debug-context.sh"
transcript="$aqui/transcript.jsonl"

fallas=0
falla() { fallas=$((fallas + 1)); printf '%s\n' "FALLA: $*" >&2; }

test -f "$script" || { falla "no existe $script"; exit 1; }
test -f "$transcript" || { falla "no existe $transcript"; exit 1; }

tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT INT TERM

# --- repo de mentira: solo el config con el flag prendido --------------------
mkdir -p "$tmp/.sdd" || exit 1
printf '%s\n' '{"debug_log": true}' > "$tmp/.sdd/config.json"

# Corre el hook desde el repo temporal (el script usa rutas relativas al cwd)
# con el payload $1, y deja su stdout+stderr en $tmp/salida.txt.
correr() {
  sed "s#FIXTURE_TRANSCRIPT#$2#" "$aqui/$1" > "$tmp/payload.json" || return 1
  ( cd "$tmp" && sh "$script" < "$tmp/payload.json" ) > "$tmp/salida.txt" 2>&1
}

# --- caso 1: inicio del agente principal -------------------------------------
correr session-start.json "$transcript"
rc=$?
test "$rc" -eq 0 || falla "session-start salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "session-start escribió en la salida: $(cat "$tmp/salida.txt")"

inicio="$tmp/.sdd/debug/principal-inicio.md"
if test -f "$inicio"; then
  grep -q '^- Contexto de arranque: 61005 tokens' "$inicio" ||
    falla "el inicio no reporta 61005 de arranque: $(grep -i arranque "$inicio")"
  grep -q '^- Modelo: claude-opus-5$' "$inicio" ||
    falla "el inicio no reporta el modelo del transcript (CA-11)"
  grep -q 'Contexto de cierre' "$inicio" &&
    falla "el inicio no debería reportar contexto de cierre"
else
  falla "no se escribió $inicio"
fi

# --- caso 2: fin del agente principal ----------------------------------------
correr session-end.json "$transcript"
rc=$?
test "$rc" -eq 0 || falla "session-end salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "session-end escribió en la salida: $(cat "$tmp/salida.txt")"

fin="$tmp/.sdd/debug/principal-fin.md"
if test -f "$fin"; then
  grep -q '^- Contexto de arranque: 61005 tokens' "$fin" ||
    falla "el fin no reporta 61005 de arranque"
  grep -q '^- Contexto de cierre: 90502 tokens' "$fin" ||
    falla "el fin no reporta 90502 de cierre: $(grep -i cierre "$fin")"
  grep -q '^- Crecimiento: 29497 tokens$' "$fin" ||
    falla "el fin no reporta 29497 de crecimiento: $(grep -i crecimiento "$fin")"
  grep -q '^- Output acumulado: 450 tokens$' "$fin" ||
    falla "el fin no acumula los 450 tokens de output"
  grep -q '^- Modelo: claude-opus-5$' "$fin" ||
    falla "el fin no reporta el modelo del transcript (CA-11)"
else
  falla "no se escribió $fin"
fi

# --- caso 3: transcript inexistente -> silencio y sin renglón (CA-8) ---------
rm -rf "$tmp/.sdd/debug"
correr session-end.json "$tmp/no-existe.jsonl"
rc=$?
test "$rc" -eq 0 || falla "con transcript inexistente salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "con transcript inexistente escribió en la salida"
if test -f "$tmp/.sdd/debug/principal-fin.md"; then
  grep -q 'Contexto de arranque' "$tmp/.sdd/debug/principal-fin.md" &&
    falla "con transcript inexistente igual reportó totales"
fi

# --- caso 4: transcript sin usage -> tampoco escribe la sección (CA-8) -------
rm -rf "$tmp/.sdd/debug"
printf '%s\n' '{"type":"user","message":{"content":"hola"}}' > "$tmp/raro.jsonl"
correr session-end.json "$tmp/raro.jsonl"
rc=$?
test "$rc" -eq 0 || falla "con transcript sin usage salió con $rc, se esperaba 0"
test -s "$tmp/salida.txt" && falla "con transcript sin usage escribió en la salida"
if test -f "$tmp/.sdd/debug/principal-fin.md"; then
  grep -q 'Contexto de arranque' "$tmp/.sdd/debug/principal-fin.md" &&
    falla "con transcript sin usage igual reportó totales"
fi

test "$fallas" -eq 0 || exit 1
exit 0
