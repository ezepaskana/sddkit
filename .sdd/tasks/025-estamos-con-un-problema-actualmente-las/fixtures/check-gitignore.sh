#!/bin/sh
# Verificación del paso 16 (tarea 025): el directorio de debug se auto-ignora
# (CA-10).
#
# El hook corre en CUALQUIER repo que instale el plugin, no solo en sddkit: no
# se le puede editar el .gitignore raíz a cada uno. La solución es que, al
# crear el directorio de debug, el propio hook deje adentro un .gitignore con
# "*", que hace que git ignore todo lo que haya ahí (incluido ese mismo
# archivo) sin que el dev toque nada.
#
# Arma un repo de mentira con `git init` DE VERDAD (no alcanza con mirar si el
# archivo existe: lo que importa es que git lo ignore) y comprueba:
#
#   caso 1 — índice sin tareas (fallback .sdd/debug/) -> git ignora la carpeta
#   caso 2 — carpeta de una tarea in-progress         -> git también la ignora
#   caso 3 — idempotencia: dos corridas seguidas       -> el .gitignore no cambia (cmp)
#   caso 4 — silencio absoluto y exit 0 en todos los casos
#
# Sale 0 solo si todo da; ≠ 0 con el motivo por stderr.
#
# POSIX sh + git + cmp. Sin jq, Node ni Python (BR-079).

set -u

unset CLAUDE_PLUGIN_ROOT 2>/dev/null || true

aqui=$(cd "$(dirname "$0")" && pwd)
raiz=$(cd "$aqui/../../../.." && pwd)
script="$raiz/hooks/debug-context.sh"
transcript="$aqui/transcript.jsonl"

fallas=0
falla() { fallas=$((fallas + 1)); printf '%s\n' "FALLA: $*" >&2; }

test -f "$script" || { falla "no existe $script"; exit 1; }
test -f "$transcript" || { falla "no existe $transcript"; exit 1; }
command -v git >/dev/null 2>&1 || { falla "no hay git disponible para el verificador"; exit 1; }

tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT INT TERM

# Corre el hook desde el repo de mentira $1 con el payload $2, dejando su
# stdout+stderr juntos en $tmp/salida.txt. El cwd nunca es el repo real.
correr() {
  ( cd "$1" && sh "$script" < "$2" ) > "$tmp/salida.txt" 2>&1
}

payload() { # $1=fixture $2=transcript $3=destino
  sed "s#FIXTURE_TRANSCRIPT#$2#" "$aqui/$1" > "$3"
}

# Repo de mentira CON git init de verdad, `debug_log` prendido y el índice de
# tareas que le pasen por stdin (vacío si no se manda nada).
armar_repo() { # $1=ruta $2...=dirs de tarea a crear
  r="$1"; shift
  rm -rf "$r"
  mkdir -p "$r/.sdd/tasks" || exit 1
  ( cd "$r" && git init -q ) || exit 1
  printf '%s\n' '{"debug_log": true}' > "$r/.sdd/config.json"
  for t in "$@"; do mkdir -p "$r/.sdd/tasks/$t" || exit 1; done
  cat > "$r/.sdd/tasks/index.json"
}

sano() { # $1=etiqueta $2=rc — silencio absoluto y exit 0 (CA-8, CA-9)
  test "$2" -eq 0 || falla "$1 salió con $2, se esperaba 0"
  test -s "$tmp/salida.txt" && falla "$1 escribió en la salida: $(cat "$tmp/salida.txt")"
  return 0
}

# ============================================================================
# caso 1: fallback .sdd/debug/, sin ninguna tarea en el índice
# ============================================================================
repo1="$tmp/repo1"
armar_repo "$repo1" <<'FIN'
{"nextId": 1, "tasks": []}
FIN
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo1" "$tmp/payload.json"
sano "caso 1" $?

gi1="$repo1/.sdd/debug/.gitignore"
archivo1="$repo1/.sdd/debug/principal-inicio.md"
test -f "$archivo1" || falla "caso 1: no se escribió $archivo1"
if test -f "$gi1"; then
  contenido=$(cat "$gi1")
  test "$contenido" = "*" || falla "caso 1: .gitignore no es exactamente '*': [$contenido]"
else
  falla "caso 1: no se creó $gi1"
fi

# Lo que importa de verdad: git, corriendo de verdad, no ve nada del directorio
# de debug ni con status ni con check-ignore.
estado1=$(cd "$repo1" && git status --porcelain -- .sdd/debug 2>/dev/null)
test -z "$estado1" ||
  falla "caso 1: git status todavía muestra algo de .sdd/debug: $estado1"
( cd "$repo1" && git check-ignore -q .sdd/debug/principal-inicio.md ) ||
  falla "caso 1: git check-ignore no ignora el archivo de debug"
( cd "$repo1" && git check-ignore -q .sdd/debug/.gitignore ) ||
  falla "caso 1: git check-ignore no se ignora ni a sí mismo"

# ============================================================================
# caso 2: carpeta de una tarea in-progress
# ============================================================================
repo2="$tmp/repo2"
armar_repo "$repo2" 020-encurso <<'FIN'
{
  "tasks": [
    {
      "id": "020",
      "dir": "020-encurso",
      "status": "in-progress",
      "updatedAt": "2026-09-03"
    }
  ]
}
FIN
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo2" "$tmp/payload.json"
sano "caso 2" $?

gi2="$repo2/.sdd/tasks/020-encurso/debug/.gitignore"
archivo2="$repo2/.sdd/tasks/020-encurso/debug/principal-inicio.md"
test -f "$archivo2" || falla "caso 2: no se escribió $archivo2"
if test -f "$gi2"; then
  contenido=$(cat "$gi2")
  test "$contenido" = "*" || falla "caso 2: .gitignore de la tarea no es '*': [$contenido]"
else
  falla "caso 2: no se creó $gi2"
fi

estado2=$(cd "$repo2" && git status --porcelain -- .sdd/tasks/020-encurso/debug 2>/dev/null)
test -z "$estado2" ||
  falla "caso 2: git status todavía muestra algo de la carpeta de debug de la tarea: $estado2"
( cd "$repo2" && git check-ignore -q .sdd/tasks/020-encurso/debug/principal-inicio.md ) ||
  falla "caso 2: git check-ignore no ignora el archivo de debug de la tarea"

# ============================================================================
# caso 3: idempotencia — dos corridas seguidas no duplican ni tocan el .gitignore
# ============================================================================
cp "$gi1" "$tmp/gi1-antes" || exit 1

# Otro evento más sobre el mismo repo (SessionEnd): vuelve a pasar por la
# creación del destino y no debería reescribir el .gitignore que ya existe.
sesionend="$aqui/session-end.json"
if test -f "$sesionend"; then
  payload session-end.json "$transcript" "$tmp/payload.json"
  correr "$repo1" "$tmp/payload.json"
  sano "caso 3" $?
fi

cmp -s "$tmp/gi1-antes" "$gi1" ||
  falla "caso 3: una segunda corrida tocó el .gitignore ya existente"
lineas=$(wc -l < "$gi1" | awk '{print $1+0}')
test "$lineas" -eq 1 ||
  falla "caso 3: el .gitignore tiene $lineas líneas, se esperaba 1 (sin contenido duplicado)"

# ============================================================================
# caso 4: silencio y exit 0 también cuando no se puede escribir nada
# ============================================================================
repo4="$tmp/repo4"
armar_repo "$repo4" <<'FIN'
{"nextId": 1, "tasks": []}
FIN
# Sin config -> el gate de debug_log corta antes de crear nada; tiene que
# seguir siendo silencioso y exit 0 (CA-7, CA-8, CA-9).
rm -f "$repo4/.sdd/config.json"
payload session-start.json "$transcript" "$tmp/payload.json"
correr "$repo4" "$tmp/payload.json"
sano "caso 4" $?
test -e "$repo4/.sdd/debug" &&
  falla "caso 4: sin debug_log igual creó el directorio de debug"

test "$fallas" -eq 0 || exit 1
exit 0
