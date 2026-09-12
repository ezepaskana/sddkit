#!/bin/sh
# Verificación del paso 13 (tarea 025): destino de los archivos y completado del
# archivo de inicio del agente principal (CA-4, CA-11, CA-12).
#
# Los dos defectos que arregla el paso salieron de una corrida real en otro
# repo:
#
#   A. la tarea estaba en `draft`, no en `in-progress`, y todo terminó suelto
#      en `.sdd/debug/` en vez de la carpeta de la tarea;
#   B. `principal-inicio.md` salió sin totales exactos ni modelo, porque en el
#      SessionStart el transcript todavía no tiene ningún registro `usage`.
#
# Arma repos de mentira en directorios temporales y comprueba:
#
#   caso 1 — hay una tarea in-progress          -> escribe en su carpeta
#   caso 2 — ninguna in-progress, varias tareas -> carpeta de la última actualizada
#   caso 3 — empate de updatedAt                -> gana el id más alto
#   caso 4 — índice sin tareas                  -> `.sdd/debug/`
#   caso 5 — SessionStart con transcript vacío  -> inicio sin totales exactos
#   caso 6 — corrida posterior                  -> el MISMO archivo se completa
#   caso 7 — segunda corrida posterior          -> el archivo no cambia (cmp)
#   caso 8 — transcript todavía vacío           -> no se completa nada, sale 0
#   caso 9 — mutaciones                         -> el verificador falla de verdad
#
# Sale 0 solo si todo da; ≠ 0 con el motivo por stderr.
#
# POSIX sh + grep/sed/awk/cmp. Sin jq, Node ni Python (BR-079).

set -u

# El hook mide los .md del plugin instalado si esta variable está seteada; acá
# los repos son de mentira, así que la sacamos del ambiente.
unset CLAUDE_PLUGIN_ROOT 2>/dev/null || true

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

# Corre el hook desde el repo de mentira $1 con el payload $2, dejando su
# stdout+stderr juntos en $tmp/salida.txt. El cwd nunca es el repo real.
correr() {
  ( cd "$1" && sh "$script" < "$2" ) > "$tmp/salida.txt" 2>&1
}

# Payload con el placeholder FIXTURE_TRANSCRIPT reemplazado por $2.
payload() { # $1=fixture $2=transcript $3=destino
  sed "s#FIXTURE_TRANSCRIPT#$2#" "$aqui/$1" > "$3"
}

# Repo de mentira con `debug_log` prendido y el índice que le pasen por stdin.
# $1=ruta del repo, $2...=dirs de tarea a crear.
armar_repo() {
  r="$1"; shift
  rm -rf "$r"
  mkdir -p "$r/.sdd/tasks" || exit 1
  printf '%s\n' '{"debug_log": true}' > "$r/.sdd/config.json"
  for t in "$@"; do mkdir -p "$r/.sdd/tasks/$t" || exit 1; done
  cat > "$r/.sdd/tasks/index.json"
}

# Silencio absoluto y exit 0 (CA-8, CA-9), en todos los casos.
sano() { # $1=etiqueta $2=rc
  test "$2" -eq 0 || falla "$1 salió con $2, se esperaba 0"
  test -s "$tmp/salida.txt" && falla "$1 escribió en la salida: $(cat "$tmp/salida.txt")"
  return 0
}

# ============================================================================
# CA-4: el destino es SIEMPRE la carpeta de una tarea
# ============================================================================

# --- caso 1: hay una tarea in-progress -> su carpeta -------------------------
repo="$tmp/repo1"
armar_repo "$repo" 010-vieja 020-encurso <<'FIN'
{
  "nextId": 21,
  "tasks": [
    {
      "id": "010",
      "dir": "010-vieja",
      "status": "done",
      "updatedAt": "2026-09-01"
    },
    {
      "id": "020",
      "dir": "020-encurso",
      "status": "in-progress",
      "updatedAt": "2026-08-01"
    }
  ]
}
FIN
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 1" $?

test -f "$repo/.sdd/tasks/020-encurso/debug/principal-inicio.md" ||
  falla "caso 1: no escribió en la carpeta de la tarea in-progress"
test -e "$repo/.sdd/debug" &&
  falla "caso 1: escribió en .sdd/debug teniendo una tarea in-progress"

# --- caso 2: ninguna in-progress -> la última actualizada (el defecto real) --
repo="$tmp/repo2"
armar_repo "$repo" 010-vieja 024-media 025-nueva <<'FIN'
{
  "nextId": 26,
  "tasks": [
    {
      "id": "010",
      "dir": "010-vieja",
      "status": "done",
      "updatedAt": "2026-07-27"
    },
    {
      "id": "025",
      "dir": "025-nueva",
      "status": "draft",
      "updatedAt": "2026-09-03"
    },
    {
      "id": "024",
      "dir": "024-media",
      "status": "done",
      "updatedAt": "2026-09-02"
    }
  ]
}
FIN
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 2" $?

test -f "$repo/.sdd/tasks/025-nueva/debug/principal-inicio.md" ||
  falla "caso 2: sin tarea in-progress no escribió en la carpeta de la última actualizada (025-nueva)"
test -e "$repo/.sdd/debug" &&
  falla "caso 2: cayó en .sdd/debug teniendo tareas en el índice"
test -e "$repo/.sdd/tasks/024-media/debug" &&
  falla "caso 2: escribió en una tarea que no es la última actualizada"

# --- caso 3: empate de updatedAt -> gana el id más alto ----------------------
repo="$tmp/repo3"
armar_repo "$repo" 009-baja 021-alta <<'FIN'
{
  "tasks": [
    {
      "id": "021",
      "dir": "021-alta",
      "status": "done",
      "updatedAt": "2026-09-03"
    },
    {
      "id": "009",
      "dir": "009-baja",
      "status": "draft",
      "updatedAt": "2026-09-03"
    }
  ]
}
FIN
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 3" $?

test -f "$repo/.sdd/tasks/021-alta/debug/principal-inicio.md" ||
  falla "caso 3: con empate de updatedAt no ganó el id más alto (021-alta)"

# --- caso 4: índice sin tareas -> .sdd/debug ---------------------------------
repo="$tmp/repo4"
armar_repo "$repo" <<'FIN'
{
  "nextId": 1,
  "tasks": []
}
FIN
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 4" $?

test -f "$repo/.sdd/debug/principal-inicio.md" ||
  falla "caso 4: con el índice sin tareas no escribió en .sdd/debug"

# ============================================================================
# CA-12 + CA-11: el inicio del principal se completa en la corrida siguiente
# ============================================================================

# El transcript de una sesión recién arrancada: existe pero sin registros de
# uso. El del segundo momento ya tiene las dos llamadas del fixture.
vacio="$tmp/vacio.jsonl"
printf '%s\n' '{"type":"user","isSidechain":false,"message":{"content":"arrancamos"}}' > "$vacio"

repo="$tmp/repo5"
armar_repo "$repo" 025-nueva <<'FIN'
{
  "tasks": [
    {
      "id": "025",
      "dir": "025-nueva",
      "status": "in-progress",
      "updatedAt": "2026-09-03"
    }
  ]
}
FIN
printf '%s\n' 'Convenciones del repo de mentira.' > "$repo/CLAUDE.md"
printf '%s\n' 'plan del paso 13' > "$repo/.sdd/tasks/025-nueva/plan.md"

inicio="$repo/.sdd/tasks/025-nueva/debug/principal-inicio.md"

# --- caso 5: SessionStart con transcript sin usage ---------------------------
payload session-start.json "$vacio" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 5" $?

if test -f "$inicio"; then
  grep -q '^## Contexto medido' "$inicio" &&
    falla "caso 5: sin registros de uso no debería haber sección exacta"
  grep -q '^- Contexto de arranque:' "$inicio" &&
    falla "caso 5: sin registros de uso no debería haber total exacto"
  grep -q '^## Desglose estimado' "$inicio" ||
    falla "caso 5: falta el desglose estimado, que sí se puede escribir"
  # CA-11: el modelo del payload sirve de provisorio hasta que lo confirme el
  # transcript, y se declara como provisorio.
  grep -q '^- Modelo informado por el hook (provisorio' "$inicio" ||
    falla "caso 5: no registró el modelo provisorio del payload de SessionStart"
else
  falla "caso 5: no se escribió $inicio"
fi

# --- caso 6: la primera corrida posterior lo completa ------------------------
# El transcript ya tiene registros: arranque = 5 + 1000 + 60000 = 61005.
payload pretooluse-task.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 6" $?

if test -f "$inicio"; then
  grep -q '^- Contexto de arranque: 61005 tokens (input 5 + cache_creation 1000 + cache_read 60000)$' "$inicio" ||
    falla "caso 6: el inicio no se completó con el total exacto de la primera llamada: $(grep -i arranque "$inicio")"
  grep -q '^- Modelo: claude-opus-5$' "$inicio" ||
    falla "caso 6: el inicio no se completó con el modelo del transcript (CA-11)"
  grep -q 'Contexto de cierre' "$inicio" &&
    falla "caso 6: el inicio no debería reportar contexto de cierre"
  # Los números completados son los de la PRIMERA llamada, no los del momento
  # en que se completa (la última del fixture es 90502).
  grep -q '90502' "$inicio" &&
    falla "caso 6: completó con los números del momento, no con los del arranque"
  # Sin renglones duplicados.
  n=$(grep -c '^- Contexto de arranque:' "$inicio")
  test "$n" -eq 1 || falla "caso 6: hay $n renglones de contexto de arranque, se esperaba 1"
  n=$(grep -c '^- Modelo:' "$inicio")
  test "$n" -eq 1 || falla "caso 6: hay $n renglones '- Modelo:', se esperaba 1"
  n=$(grep -c '^## Contexto medido' "$inicio")
  test "$n" -eq 1 || falla "caso 6: hay $n secciones de contexto medido, se esperaba 1"
  # Lo que ya estaba no se perdió.
  grep -q '^## Desglose estimado' "$inicio" ||
    falla "caso 6: el completado se comió el desglose estimado"
  grep -q '^- Evento: SessionStart$' "$inicio" ||
    falla "caso 6: el completado se comió el encabezado del SessionStart"
  # La sección exacta va antes del desglose, como la habría escrito el inicio.
  awk '/^## Contexto medido/ { medido = NR } /^## Desglose/ { desglose = NR }
       END { exit (medido > 0 && desglose > 0 && medido < desglose ? 0 : 1) }' "$inicio" ||
    falla "caso 6: la sección exacta no quedó antes del desglose"
  # El completado no puede pisar el archivo de otro agente.
  test -f "$repo/.sdd/tasks/025-nueva/debug/subagente-toolu_01ABC123-inicio.md" ||
    falla "caso 6: el PreToolUse no escribió su propio archivo de subagente"
else
  falla "caso 6: desapareció $inicio"
fi

# --- caso 7: idempotencia -> la segunda corrida no lo toca -------------------
cp "$inicio" "$tmp/inicio-antes.md" || exit 1
payload session-end.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 7" $?

cmp -s "$tmp/inicio-antes.md" "$inicio" ||
  falla "caso 7: una segunda corrida posterior volvió a tocar el archivo de inicio"
test -f "$repo/.sdd/tasks/025-nueva/debug/principal-fin.md" ||
  falla "caso 7: el SessionEnd no escribió su propio archivo de fin"

# --- caso 8: el transcript sigue sin registros -> no pasa nada ---------------
repo="$tmp/repo6"
armar_repo "$repo" 025-nueva <<'FIN'
{
  "tasks": [
    {
      "id": "025",
      "dir": "025-nueva",
      "status": "in-progress",
      "updatedAt": "2026-09-03"
    }
  ]
}
FIN
printf '%s\n' 'Convenciones del repo de mentira.' > "$repo/CLAUDE.md"
inicio6="$repo/.sdd/tasks/025-nueva/debug/principal-inicio.md"

payload session-start.json "$vacio" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 8 (inicio)" $?
test -f "$inicio6" || falla "caso 8: no se escribió $inicio6"
cp "$inicio6" "$tmp/inicio6-antes.md" || exit 1

payload pretooluse-task.json "$vacio" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 8 (posterior)" $?
cmp -s "$tmp/inicio6-antes.md" "$inicio6" ||
  falla "caso 8: con el transcript todavía sin registros igual tocó el archivo"

# Transcript inexistente: tampoco pasa nada, y sin ruido.
payload pretooluse-task.json "$repo/no-existe.jsonl" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 8 (sin transcript)" $?
cmp -s "$tmp/inicio6-antes.md" "$inicio6" ||
  falla "caso 8: sin transcript igual tocó el archivo de inicio"

# Y sin archivo de inicio no hay nada que completar.
rm -f "$inicio6"
payload pretooluse-task.json "$transcript" "$tmp/payload.json"
correr "$repo" "$tmp/payload.json"
sano "caso 8 (sin archivo de inicio)" $?
test -f "$inicio6" &&
  falla "caso 8: inventó un archivo de inicio que nunca existió"

# ============================================================================
# caso 9: el verificador tiene que fallar de verdad
# ============================================================================
# Se muta el archivo generado (no el script) y se comprueba que las mismas
# aserciones de arriba den ≠ 0 sobre la mutación.
mut="$tmp/mutado.md"

# Mutación A: el total exacto desaparece (el defecto B sin arreglar).
grep -v '^- Contexto de arranque:' "$tmp/inicio-antes.md" > "$mut"
grep -q '^- Contexto de arranque: 61005 tokens' "$mut" &&
  falla "caso 9: la aserción del total exacto no detecta que el renglón falta"

# Mutación B: el renglón duplicado.
cat "$tmp/inicio-antes.md" > "$mut"
grep '^- Contexto de arranque:' "$tmp/inicio-antes.md" >> "$mut"
n=$(grep -c '^- Contexto de arranque:' "$mut")
test "$n" -eq 1 &&
  falla "caso 9: la aserción de duplicados no detecta el renglón repetido"

# Mutación C: el modelo desaparece.
grep -v '^- Modelo:' "$tmp/inicio-antes.md" > "$mut"
grep -q '^- Modelo: claude-opus-5$' "$mut" &&
  falla "caso 9: la aserción del modelo no detecta que el renglón falta"

# Mutación D: el archivo cambia -> cmp lo tiene que ver.
printf '%s\n' '- renglon de mas' >> "$mut"
cmp -s "$tmp/inicio-antes.md" "$mut" &&
  falla "caso 9: cmp no detecta un archivo modificado"

test "$fallas" -eq 0 || exit 1
exit 0
