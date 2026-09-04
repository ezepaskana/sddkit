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
#   - que el archivo de INICIO de un worker lanzado por la tool `Skill` (el
#     camino real de la corrida en tinku) registre la skill y sus args, sin
#     inventar un brief ni un alias de modelo que ese payload no trae (CA-3);
#   - que un `PreToolUse` de una tool que no lanza subagentes no escriba nada;
#   - que el archivo de FIN registre el crecimiento y declare SIEMPRE sobre qué
#     base lo calculó, con los tres caminos posibles: `transcript propio del
#     subagente` cuando se lo pudo aislar, `entradas sidechain de la sesión`
#     cuando el transcript de la sesión las trae, y —cuando no hay ninguna de
#     las dos— los números de la SESIÓN declarados como tales, nunca atribuidos
#     al worker (CA-2, S-2);
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
# $3 (opcional) es el TMPDIR con el que corre: es donde el hook busca el
# transcript propio del worker, así que sirve para plantarle uno.
correr() {
  if test -n "${3:-}"; then
    ( cd "$1" && TMPDIR="$3" sh "$script" < "$2" ) > "$tmp/salida.txt" 2>&1
  else
    ( cd "$1" && sh "$script" < "$2" ) > "$tmp/salida.txt" 2>&1
  fi
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

# --- caso 4: no se pudo aislar al worker -> números de la SESIÓN (S-2) -------
# `transcript.jsonl` no tiene entradas sidechain ni tool_use de subagente, y no
# hay transcript propio del worker por ningún lado. Este es exactamente el
# defecto de la corrida real: antes el archivo decía "base: transcript propio
# del subagente" y le atribuía al worker los números del principal. Ahora los
# números se reportan como de la sesión y se dice que no son atribuibles a él.
rm -rf "$repo/.sdd/debug"
vacio_tmp="$tmp/tmp-vacio"
mkdir -p "$vacio_tmp" || exit 1
payload_stop "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json" "$vacio_tmp"
silencioso "caso 4" $?

fin4="$repo/.sdd/debug/subagente-agent_xyz789-fin.md"
if test -f "$fin4"; then
  grep -q '^- Base de los números: transcript de la sesión que lo lanzó (no fue posible aislar al subagente)$' "$fin4" ||
    falla "caso 4: no declara que la base es la sesión: $(grep -i 'base de los' "$fin4")"
  # El defecto que este paso arregla: NADA se le atribuye al worker.
  grep -q 'Crecimiento del subagente' "$fin4" &&
    falla "caso 4: le atribuye al worker un crecimiento que no pudo aislar"
  grep -q 'del subagente: [0-9]' "$fin4" &&
    falla "caso 4: hay números atribuidos al subagente sin haberlo aislado: $(grep 'del subagente: [0-9]' "$fin4")"
  grep -q 'base: transcript propio del subagente' "$fin4" &&
    falla "caso 4: etiqueta como propio del subagente un número que no aisló"
  # Los números sí se reportan, pero como lo que son: los de la sesión.
  grep -q '^- Crecimiento de la sesión: 29497 tokens (base: transcript de la sesión que lo lanzó (no fue posible aislar al subagente))$' "$fin4" ||
    falla "caso 4: el crecimiento de la sesión no es 29497 con su base declarada: $(grep -i 'de la sesión' "$fin4")"
  grep -q '^- Contexto de arranque de la sesión: 61005 tokens' "$fin4" ||
    falla "caso 4: el arranque de la sesión no es 61005"
  grep -q '^- Contexto de cierre de la sesión: 90502 tokens' "$fin4" ||
    falla "caso 4: el cierre de la sesión no es 90502"
  grep -q 'NO son atribuibles al subagente' "$fin4" ||
    falla "caso 4: no aclara que los números no son atribuibles al worker"
  grep -q '^- Agent id: agent_xyz789$' "$fin4" ||
    falla "caso 4: el fin no lleva adentro el agent_id"
  grep -q '^- Apareo con el archivo de inicio: por orden y marca temporal' "$fin4" ||
    falla "caso 4: no declara que el apareo quedó por orden y marca temporal"
  # Copia para las mutaciones del caso 14: los casos siguientes borran el debug.
  cp "$fin4" "$tmp/fin4.md" || exit 1
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

# ============================================================================
# El worker no siempre lo lanza una tool llamada `Task` (defecto real)
# ============================================================================
# En la corrida de tinku el `PreToolUse` nunca disparó: el matcher era `Task` y
# en todo el transcript no había un solo tool_use con ese nombre. El subagente
# había salido por la tool `Skill`. Las tres formas se aceptan; el resto, no.

# --- caso 10: PreToolUse de `Agent` -> inicio con brief y modelo pedido -------
rm -rf "$repo/.sdd/debug"
printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"PreToolUse","tool_name":"Agent","tool_input":{"description":"Paso 14: subagente real","subagent_type":"general-purpose","model":"opus","prompt":"Trabajas en el repo. Ejecuta SOLO este paso y tocá hooks/debug-context.sh."},"tool_use_id":"toolu_01AGENT"}\n' \
  "$side" > "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 10" $?

ini10="$repo/.sdd/debug/subagente-toolu_01AGENT-inicio.md"
if test -f "$ini10"; then
  grep -q '^- Tipo de subagente pedido: general-purpose$' "$ini10" ||
    falla "caso 10: con tool_name Agent no registra el subagent_type pedido"
  grep -q '^- Alias de modelo pedido: opus$' "$ini10" ||
    falla "caso 10: con tool_name Agent no registra el alias de modelo pedido"
  grep -q '^- Nivel del plan: fuerte ' "$ini10" ||
    falla "caso 10: no mapea opus al nivel fuerte de config.json"
  # CA-3: el brief mandado queda registrado (medido, no volcado).
  grep -q '^- Brief del paso (estimado): [0-9][0-9]* bytes, aprox\. [0-9][0-9]* tokens$' "$ini10" ||
    falla "caso 10: no registra el brief que se le mandó al worker: $(grep -i brief "$ini10")"
  grep -q 'Ejecuta SOLO este paso' "$ini10" &&
    falla "caso 10: volcó el brief en vez de medirlo"
else
  falla "caso 10: un PreToolUse de Agent no escribió $ini10"
fi

# --- caso 11: PreToolUse de `Skill` -> skill y args, sin inventar modelo ------
# El tool_input de Skill tiene otra forma: `skill` y `args`, sin prompt ni
# model. El payload trae además un `model` de nivel superior, que NO es el
# modelo pedido para el worker y no se puede reportar como tal.
rm -rf "$repo/.sdd/debug"
printf '{"session_id":"abc","transcript_path":"%s","model":"claude-opus-5","hook_event_name":"PreToolUse","tool_name":"Skill","tool_input":{"skill":"sddkit:sdd-analyze","args":"revisa el flujo de hooks"},"tool_use_id":"toolu_01SKILL"}\n' \
  "$side" > "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 11" $?

ini11="$repo/.sdd/debug/subagente-toolu_01SKILL-inicio.md"
if test -f "$ini11"; then
  grep -q '^- Skill que lanzó al subagente: sddkit:sdd-analyze$' "$ini11" ||
    falla "caso 11: no registra la skill que lanzó al subagente: $(grep -i skill "$ini11")"
  grep -q '^- Args de la skill (recortados): revisa el flujo de hooks$' "$ini11" ||
    falla "caso 11: no registra los args de la skill: $(grep -i args "$ini11")"
  grep -q '^- Tool use id: toolu_01SKILL$' "$ini11" ||
    falla "caso 11: el inicio no lleva adentro su tool_use_id"
  # Nada de inventar lo que el payload de Skill no trae.
  grep -q 'Alias de modelo pedido' "$ini11" &&
    falla "caso 11: inventó un alias de modelo pedido que el payload de Skill no trae"
  grep -q 'Nivel del plan' "$ini11" &&
    falla "caso 11: inventó un nivel del plan sin alias de modelo"
  grep -q 'Tipo de subagente pedido' "$ini11" &&
    falla "caso 11: inventó un subagent_type que el payload de Skill no trae"
  grep -q 'Brief del paso' "$ini11" &&
    falla "caso 11: inventó un brief que el payload de Skill no trae"
  # El modelo que EFECTIVAMENTE corrió sí se reporta, y es el del transcript.
  grep -q '^- Modelo: claude-opus-5$' "$ini11" ||
    falla "caso 11: se perdió el modelo que efectivamente corrió"
  test "$(grep -c '^- Modelo' "$ini11")" -eq 1 ||
    falla "caso 11: hay más de un renglón '- Modelo'"
  # Copia para las mutaciones del caso 14: los casos siguientes borran el debug.
  cp "$ini11" "$tmp/ini11.md" || exit 1
else
  falla "caso 11: un PreToolUse de Skill no escribió $ini11"
fi

# --- caso 12: PreToolUse de otra tool -> no escribe nada, sale 0 -------------
rm -rf "$repo/.sdd/debug"
printf '{"session_id":"abc","transcript_path":"%s","hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"ls -la","description":"listar"},"tool_use_id":"toolu_01BASH"}\n' \
  "$side" > "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
silencioso "caso 12" $?

test -e "$repo/.sdd/debug/subagente-toolu_01BASH-inicio.md" &&
  falla "caso 12: un PreToolUse de Bash escribió un archivo de subagente"
test -e "$repo/.sdd/debug" &&
  falla "caso 12: un PreToolUse de Bash creó el directorio de debug"

# ============================================================================
# CA-2 + S-2: la base de los números, los tres caminos
# ============================================================================
# Camino 1 (transcript propio del worker) acá; el 2 (sidechain) es el caso 3 y
# el 3 (números de la sesión, no atribuidos) es el caso 4.
#
# Mientras la sesión corre puede existir un archivo por agente bajo
# `<tmp>/<slug del proyecto>/<session_id>/tasks/<agent_id>*`. Se lo planta con
# TMPDIR y sus números tienen que ganarle a los de la sesión.
#
#   worker sintético: 7000 -> 12345, 3 llamadas, crecimiento 5345
#   sesión ($side):  40010 -> 45020, sidechain 20000 -> 30203

worker_jsonl() { # $1=destino
  {
    printf '%s\n' '{"type":"assistant","message":{"model":"claude-sonnet-5","usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":7000,"output_tokens":10}}}'
    printf '%s\n' '{"type":"assistant","message":{"model":"claude-sonnet-5","usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":9000,"output_tokens":10}}}'
    printf '%s\n' '{"type":"assistant","message":{"model":"claude-sonnet-5","usage":{"input_tokens":45,"cache_creation_input_tokens":300,"cache_read_input_tokens":12000,"output_tokens":10}}}'
  } > "$1"
}

# --- caso 13: transcript propio del worker -> gana sobre la sesión -----------
rm -rf "$repo/.sdd/debug"
falso_tmp="$tmp/tmp-worker"
mkdir -p "$falso_tmp/-Users-eze-proyecto/abc/tasks" || exit 1
worker_jsonl "$falso_tmp/-Users-eze-proyecto/abc/tasks/agent_xyz789.jsonl"

payload_stop "$side" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json" "$falso_tmp"
silencioso "caso 13" $?

fin13="$repo/.sdd/debug/subagente-toolu_01ABC123-fin.md"
if test -f "$fin13"; then
  grep -q '^- Base de los números: transcript propio del subagente$' "$fin13" ||
    falla "caso 13: no declara la base del transcript propio: $(grep -i 'base de los' "$fin13")"
  grep -q '^- Crecimiento del subagente: 5345 tokens (base: transcript propio del subagente)$' "$fin13" ||
    falla "caso 13: el delta propio no es 5345: $(grep -i 'del subagente' "$fin13")"
  grep -q '^- Contexto de arranque del subagente: 7000 tokens' "$fin13" ||
    falla "caso 13: el arranque propio no es 7000"
  grep -q '^- Contexto de cierre del subagente: 12345 tokens' "$fin13" ||
    falla "caso 13: el cierre propio no es 12345"
  grep -q '^- Llamadas del subagente: 3$' "$fin13" ||
    falla "caso 13: no cuenta las 3 llamadas del worker"
  grep -q '^- Transcript propio del subagente: .*agent_xyz789' "$fin13" ||
    falla "caso 13: no dice de qué archivo salieron los números"
  # El transcript propio le gana a las entradas sidechain de la sesión. Los
  # números de la sesión siguen estando en `## Contexto medido`, que es de la
  # sesión y está bien; lo que no puede pasar es que se los atribuya al worker.
  grep -q 'entradas sidechain de la sesión' "$fin13" &&
    falla "caso 13: se quedó con los números sidechain teniendo el transcript propio"
  grep 'del subagente' "$fin13" | grep -qE '10203|5010|20000|30203' &&
    falla "caso 13: le atribuye al worker números de la sesión teniendo su transcript propio"
else
  falla "caso 13: no se escribió $fin13"
fi

# El mismo archivo, adentro de un directorio por agente y un nivel más abajo.
rm -rf "$repo/.sdd/debug"
falso_tmp2="$tmp/tmp-worker-dir"
mkdir -p "$falso_tmp2/claude-501/-Users-eze-proyecto/abc/tasks/agent_xyz789" || exit 1
worker_jsonl "$falso_tmp2/claude-501/-Users-eze-proyecto/abc/tasks/agent_xyz789/transcript.jsonl"

payload_stop "$side" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json" "$falso_tmp2"
silencioso "caso 13 (directorio)" $?

if test -f "$fin13"; then
  grep -q '^- Crecimiento del subagente: 5345 tokens (base: transcript propio del subagente)$' "$fin13" ||
    falla "caso 13 (directorio): no encontró el transcript del worker dentro del directorio por agente"
else
  falla "caso 13 (directorio): no se escribió $fin13"
fi

# ============================================================================
# caso 14: el verificador tiene que fallar de verdad
# ============================================================================
# Se muta el archivo generado (no el script) y se comprueba que las mismas
# aserciones de arriba den ≠ 0 sobre la mutación.
mut="$tmp/mutado.md"

# Mutación A: el defecto original — la base de la sesión etiquetada como propia.
sed 's/^- Base de los números: transcript de la sesión.*/- Base de los números: transcript propio del subagente/; s/^- Crecimiento de la sesión: /- Crecimiento del subagente: /' \
  "$tmp/fin4.md" > "$mut"
grep -q 'Crecimiento del subagente' "$mut" ||
  falla "caso 14: la aserción de la atribución al worker no ve la mutación"
grep -q '^- Base de los números: transcript de la sesión que lo lanzó (no fue posible aislar al subagente)$' "$mut" &&
  falla "caso 14: la aserción de la base de la sesión no ve la mutación"

# Mutación B: desaparece la aclaración de que no son atribuibles al worker.
grep -v "NO son atribuibles al subagente" "$tmp/fin4.md" > "$mut"
grep -q 'NO son atribuibles al subagente' "$mut" &&
  falla "caso 14: la aserción de la aclaración no ve que el renglón falta"

# Mutación C: el inicio de la Skill inventa un alias de modelo.
{ cat "$tmp/ini11.md"; printf '%s\n' "- Alias de modelo pedido: opus"; } > "$mut"
grep -q 'Alias de modelo pedido' "$mut" ||
  falla "caso 14: la aserción del alias inventado no ve la mutación"

# Mutación D: el archivo del worker pierde su base propia.
sed 's/(base: transcript propio del subagente)//' "$fin13" > "$mut"
grep -q '^- Crecimiento del subagente: 5345 tokens (base: transcript propio del subagente)$' "$mut" &&
  falla "caso 14: la aserción de la base propia no ve la mutación"

test "$fallas" -eq 0 || exit 1
exit 0
