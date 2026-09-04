#!/bin/sh
# Verificación del paso 7 (tarea 025): inicio y fin del subagente.
#
# Arma repos de mentira en directorios temporales (con `debug_log` prendido) y
# corre `hooks/debug-context.sh` con los payloads de fixture, comprobando:
#
#   - que el archivo de INICIO de un worker registre lo que el plan PIDIÓ: el
#     tipo de subagente, el alias de modelo (`sonnet`) y el nivel al que ese
#     alias mapea en `.sdd/config.json → models` (`medio`), sin pisar ni
#     traducir el renglón del modelo que EFECTIVAMENTE corrió (CA-3, CA-11);
#   - que el archivo de FIN registre el crecimiento del worker y declare sobre
#     qué base lo calculó: `transcript propio del subagente` cuando el
#     transcript no tiene entradas sidechain, `entradas sidechain de la sesión`
#     cuando sí las tiene (CA-2);
#   - que inicio y fin del MISMO worker se apareen: por nombre de archivo si el
#     tool_use_id se pudo resolver desde el transcript, y si no, con los dos
#     identificadores adentro más la línea explícita de que el apareo es por
#     orden y marca temporal (el defecto que este paso arregla);
#   - que con campos ausentes salga 0 sin escribir nada (CA-8, CA-9).
#
# Números del transcript sintético `transcript-sidechain.jsonl`:
#   sesión entera:        40010 -> 45020, crecimiento  5010
#   solo sidechain:       20000 -> 30203, crecimiento 10203
# y de `transcript.jsonl` (sin sidechain): 61005 -> 90502, crecimiento 29497.
#
# Sale 0 solo si todo da; ≠ 0 con el motivo por stderr.
#
# POSIX sh + grep/sed/awk. Sin jq, Node ni Python (BR-079).

set -u

# El hook cae al plugin instalado si esta variable está seteada; acá queremos
# medir el repo de trabajo.
unset CLAUDE_PLUGIN_ROOT 2>/dev/null || true

aqui=$(cd "$(dirname "$0")" && pwd)
raiz=$(cd "$aqui/../../../.." && pwd)
script="$raiz/hooks/debug-context.sh"
transcript="$aqui/transcript.jsonl"
side="$aqui/transcript-sidechain.jsonl"

fallas=0
falla() { fallas=$((fallas + 1)); printf '%s\n' "FALLA: $*" >&2; }

test -f "$script" || { falla "no existe $script"; exit 1; }
test -f "$transcript" || { falla "no existe $transcript"; exit 1; }
test -f "$side" || { falla "no existe $side"; exit 1; }

tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT INT TERM

repo="$tmp/repo"
mkdir -p "$repo/.sdd" || exit 1
cat > "$repo/.sdd/config.json" <<'FIN'
{
  "debug_log": true,
  "models": {
    "rapido": "haiku",
    "medio": "sonnet",
    "fuerte": "opus"
  }
}
FIN

# Repo gemelo sin bloque `models`: el nivel no se puede mapear.
repo_sin="$tmp/repo-sin-models"
mkdir -p "$repo_sin/.sdd" || exit 1
printf '%s\n' '{"debug_log": true}' > "$repo_sin/.sdd/config.json"

# Corre el hook desde el repo $1 con el payload $2; stdout+stderr a salida.txt.
correr() {
  ( cd "$1" && sh "$script" < "$2" ) > "$tmp/salida.txt" 2>&1
}

# Payload de PreToolUse/Task. $1=transcript $2=destino $3=vacío para un
# tool_input pelado (sin subagent_type, model ni description).
payload_task() {
  if test -n "${3:-}"; then
    printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"PreToolUse","tool_name":"Task","tool_input":{"description":"Paso 7: inicio y fin del subagente","subagent_type":"general-purpose","model":"sonnet","prompt":"Ejecuta SOLO este paso."},"tool_use_id":"toolu_01ABC123"}\n' "$1" > "$2"
  else
    printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"PreToolUse","tool_name":"Task","tool_input":{"prompt":"Ejecuta SOLO este paso."},"tool_use_id":"toolu_01ABC123"}\n' "$1" > "$2"
  fi
}

# Payload de SubagentStop. $1=transcript $2=destino
payload_stop() {
  printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"SubagentStop","agent_type":"general-purpose","agent_id":"agent_xyz789","last_assistant_message":"Listo."}\n' "$1" > "$2"
}

# Chequeo de silencio y código de salida, común a todos los casos.
silencioso() { # $1=etiqueta $2=rc
  test "$2" -eq 0 || falla "$1 salió con $2, se esperaba 0"
  test -s "$tmp/salida.txt" && falla "$1 escribió en la salida: $(cat "$tmp/salida.txt")"
  return 0
}

# --- caso 1: inicio del worker, lo que pidió el plan (CA-3, CA-11) ------------
rm -rf "$repo/.sdd/debug"
payload_task "$side" "$tmp/payload.json" x
correr "$repo" "$tmp/payload.json"
silencioso "caso 1" $?

ini="$repo/.sdd/debug/subagente-toolu_01ABC123-inicio.md"
if test -f "$ini"; then
  grep -q '^- Tipo de subagente pedido: general-purpose$' "$ini" ||
    falla "caso 1: no registra el subagent_type pedido"
  grep -q '^- Alias de modelo pedido: sonnet$' "$ini" ||
    falla "caso 1: no registra el alias de modelo pedido: $(grep -i pedido "$ini")"
  grep -q '^- Nivel del plan: medio ' "$ini" ||
    falla "caso 1: no mapea sonnet al nivel medio de config.json: $(grep -i nivel "$ini")"
  grep -q '^- Tool use id: toolu_01ABC123$' "$ini" ||
    falla "caso 1: el inicio no lleva adentro su tool_use_id"
  # Lo pedido no puede pisar ni traducir lo que efectivamente corrió (CA-11).
  grep -q '^- Modelo: claude-opus-5$' "$ini" ||
    falla "caso 1: se perdió el modelo que efectivamente corrió"
  test "$(grep -c '^- Modelo' "$ini")" -eq 1 ||
    falla "caso 1: hay más de un renglón '- Modelo'"
  grep -q '^- Alias de modelo pedido: claude' "$ini" &&
    falla "caso 1: tradujo el alias pedido al id del modelo que corrió"
  # El brief no se vuelca: se mide (paso 6) y a lo sumo se identifica el paso.
  grep -q 'Ejecuta SOLO este paso' "$ini" &&
    falla "caso 1: volcó el brief en el archivo de debug"
else
  falla "caso 1: no se escribió $ini"
fi

# --- caso 2: sin bloque `models` no se inventa un nivel (CA-8) ---------------
rm -rf "$repo_sin/.sdd/debug"
payload_task "$side" "$tmp/payload.json" x
correr "$repo_sin" "$tmp/payload.json"
silencioso "caso 2" $?

ini2="$repo_sin/.sdd/debug/subagente-toolu_01ABC123-inicio.md"
if test -f "$ini2"; then
  grep -q '^- Alias de modelo pedido: sonnet$' "$ini2" ||
    falla "caso 2: sin models igual tendría que registrar el alias pedido"
  grep -q '^- Nivel del plan' "$ini2" &&
    falla "caso 2: mapeó un nivel que config.json no define"
else
  falla "caso 2: no se escribió $ini2"
fi

# --- caso 3: fin con transcript de la sesión (entradas sidechain) ------------
# El apareo sale por tool_use_id: el transcript tiene un único tool_use de Task.
payload_stop "$side" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 3" $?

fin="$repo/.sdd/debug/subagente-toolu_01ABC123-fin.md"
if test -f "$fin"; then
  grep -q '^- Crecimiento del subagente: 10203 tokens (base: entradas sidechain de la sesión)$' "$fin" ||
    falla "caso 3: el delta sidechain no es 10203: $(grep -i 'del subagente' "$fin")"
  grep -q '^- Contexto de arranque del subagente: 20000 tokens' "$fin" ||
    falla "caso 3: el arranque sidechain no es 20000"
  grep -q '^- Contexto de cierre del subagente: 30203 tokens' "$fin" ||
    falla "caso 3: el cierre sidechain no es 30203"
  grep -q '^- Llamadas del subagente: 2$' "$fin" ||
    falla "caso 3: no cuenta las 2 llamadas sidechain"
  # El delta del worker no puede ser el de la sesión entera (5010): si lo fuera,
  # el filtro de sidechain no está filtrando nada.
  grep -q '^- Crecimiento del subagente: 5010 ' "$fin" &&
    falla "caso 3: reporta el crecimiento de la sesión como si fuera el del worker"
  grep -q '^- Crecimiento: 5010 tokens$' "$fin" ||
    falla "caso 3: se perdió el crecimiento de la sesión del paso 5"
  # El delta declarado tiene que ser la resta de los dos números declarados.
  set -- $(awk '
    function valor(linea,   v) { v = linea; sub(/^[^:]*:[ \t]*/, "", v); return v + 0 }
    /^- Contexto de arranque del subagente: / { a = valor($0) }
    /^- Contexto de cierre del subagente: /   { c = valor($0) }
    /^- Crecimiento del subagente: /          { d = valor($0) }
    END { printf "%d %d %d\n", a, c, d }
  ' "$fin")
  test "$3" -eq $(($2 - $1)) ||
    falla "caso 3: el crecimiento ($3) no es cierre($2) - arranque($1)"
  # Apareo (a): los dos archivos del mismo worker se llaman igual.
  test -f "$ini" || falla "caso 3: no está el archivo de inicio para aparear"
  grep -q '^- Apareo con el archivo de inicio: por tool_use_id' "$fin" ||
    falla "caso 3: no declara el apareo por tool_use_id"
  # Los dos identificadores, adentro del archivo.
  grep -q '^- Agent id: agent_xyz789$' "$fin" ||
    falla "caso 3: el fin no lleva adentro el agent_id"
  grep -q '^- Tool use id: toolu_01ABC123$' "$fin" ||
    falla "caso 3: el fin no lleva adentro el tool_use_id"
else
  falla "caso 3: no se escribió $fin (¿el apareo por tool_use_id no salió?)"
fi

# --- caso 4: fin con transcript propio del worker ----------------------------
# `transcript.jsonl` no tiene entradas sidechain ni tool_use de Task: la base es
# el transcript propio y el apareo degrada a orden y marca temporal.
rm -rf "$repo/.sdd/debug"
payload_stop "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 4" $?

fin4="$repo/.sdd/debug/subagente-agent_xyz789-fin.md"
if test -f "$fin4"; then
  grep -q '^- Crecimiento del subagente: 29497 tokens (base: transcript propio del subagente)$' "$fin4" ||
    falla "caso 4: el delta propio no es 29497 con su base declarada: $(grep -i 'del subagente' "$fin4")"
  grep -q 'entradas sidechain' "$fin4" &&
    falla "caso 4: declara base sidechain en un transcript que no tiene sidechain"
  grep -q '^- Agent id: agent_xyz789$' "$fin4" ||
    falla "caso 4: el fin no lleva adentro el agent_id"
  grep -q '^- Apareo con el archivo de inicio: por orden y marca temporal' "$fin4" ||
    falla "caso 4: no declara que el apareo quedó por orden y marca temporal"
else
  falla "caso 4: no se escribió $fin4"
fi

# --- caso 5: dos Tasks, una ligada al agent_id -> apareo por tool_use_id ------
# Forma hipotética: si el transcript alguna vez trae el agent_id junto al
# tool_use que lanzó al worker, la liga es explícita y gana sobre la ambigüedad.
rm -rf "$repo/.sdd/debug"
{
  printf '%s\n' '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"toolu_PRIMERO","name":"Task","input":{"model":"sonnet"}}],"usage":{"input_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":999,"output_tokens":1}}}'
  printf '%s\n' '{"type":"assistant","agentId":"agent_xyz789","message":{"content":[{"type":"tool_use","id":"toolu_SEGUNDO","name":"Task","input":{"model":"sonnet"}}],"usage":{"input_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":1999,"output_tokens":1}}}'
} > "$repo/ligado.jsonl"
payload_stop "$repo/ligado.jsonl" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 5" $?

if test -f "$repo/.sdd/debug/subagente-toolu_SEGUNDO-fin.md"; then
  grep -q '^- Apareo con el archivo de inicio: por tool_use_id, que el transcript liga con el agent_id' \
    "$repo/.sdd/debug/subagente-toolu_SEGUNDO-fin.md" ||
    falla "caso 5: no declara que el apareo salió de la liga con el agent_id"
else
  falla "caso 5: con la liga explícita el fin tendría que llamarse por toolu_SEGUNDO"
fi
test -f "$repo/.sdd/debug/subagente-toolu_PRIMERO-fin.md" &&
  falla "caso 5: se apareó con el tool_use de otro worker"

# --- caso 6: dos Tasks sin liga -> degradación declarada, no inventada -------
rm -rf "$repo/.sdd/debug"
sed 's/,"agentId":"agent_xyz789"//' "$repo/ligado.jsonl" > "$repo/ambiguo.jsonl"
payload_stop "$repo/ambiguo.jsonl" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 6" $?

test -f "$repo/.sdd/debug/subagente-toolu_PRIMERO-fin.md" &&
  falla "caso 6: eligió un tool_use_id entre dos candidatos ambiguos"
test -f "$repo/.sdd/debug/subagente-toolu_SEGUNDO-fin.md" &&
  falla "caso 6: eligió un tool_use_id entre dos candidatos ambiguos"
fin6="$repo/.sdd/debug/subagente-agent_xyz789-fin.md"
if test -f "$fin6"; then
  grep -q '^- Apareo con el archivo de inicio: por orden y marca temporal, no por identificador' "$fin6" ||
    falla "caso 6: con el apareo degradado no lo declara explícitamente"
else
  falla "caso 6: no se escribió $fin6"
fi

# --- caso 7: campos ausentes -> silencio y sin renglones inventados ----------
rm -rf "$repo/.sdd/debug"
payload_task "$side" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 7" $?
if test -f "$ini"; then
  grep -q 'Alias de modelo pedido' "$ini" &&
    falla "caso 7: sin model en tool_input igual reporta un alias pedido"
  grep -q 'Nivel del plan' "$ini" &&
    falla "caso 7: sin model en tool_input igual reporta un nivel"
  grep -q 'Tipo de subagente pedido' "$ini" &&
    falla "caso 7: sin subagent_type igual reporta un tipo"
fi

# --- caso 8: fin sin transcript -> sin delta, pero sin romper (CA-8) --------
rm -rf "$repo/.sdd/debug"
payload_stop "$repo/no-existe.jsonl" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 8" $?
if test -f "$fin4"; then
  grep -q 'Crecimiento del subagente' "$fin4" &&
    falla "caso 8: sin transcript igual reporta un crecimiento"
  grep -q '^- Apareo con el archivo de inicio: por orden y marca temporal' "$fin4" ||
    falla "caso 8: sin transcript tendría que declarar el apareo degradado"
else
  falla "caso 8: no se escribió $fin4"
fi

# --- caso 9: el agente principal no lleva sección de subagente ---------------
rm -rf "$repo/.sdd/debug"
printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"SessionStart","source":"startup"}\n' \
  "$side" > "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 9" $?
if test -f "$repo/.sdd/debug/principal-inicio.md"; then
  grep -q '^## Subagente' "$repo/.sdd/debug/principal-inicio.md" &&
    falla "caso 9: el principal no debería llevar sección de subagente"
else
  falla "caso 9: no se escribió el inicio del principal"
fi

test "$fallas" -eq 0 || exit 1
exit 0
