#!/bin/sh
# Instrumentación de contexto por agente (tarea 025, BR-093).
#
# Lee el payload del hook por stdin (JSON de una línea) y el nombre del evento
# del primer argumento. Si `.sdd/config.json` declara `debug_log: true`, escribe
# un archivo de inicio y uno de fin por agente dentro de la carpeta de la tarea
# (`.sdd/tasks/<id>/debug/`, CA-4). Con el flag apagado no escribe ni imprime
# nada (CA-7).
#
# Silencio absoluto: todo el cuerpo va con stdout y stderr a /dev/null y el
# script sale SIEMPRE con 0 (CA-8, CA-9). Un hook que imprime contamina el
# contexto del agente, que es justamente lo que medimos.
#
# POSIX sh + grep/sed/awk/cat/mkdir/date/wc/dirname. Sin jq, Node ni Python
# (BR-079).

{
  event="${1:-}"
  payload=$(cat)

  # --- helpers de parseo tolerante -------------------------------------------
  # Sacan un escalar del JSON de una línea. Si el campo no aparece con la forma
  # esperada devuelven vacío: el script degrada, nunca revienta.

  json_str() { # $1=clave -> valor string, o vacío
    printf '%s\n' "$payload" |
      sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
      head -n 1
  }

  slug() { # $1=texto -> apto para nombre de archivo
    printf '%s' "$1" | sed 's/[^A-Za-z0-9_-]/_/g' | cut -c1-64
  }

  # --- gate: debug_log en true (CA-7) ----------------------------------------
  config=".sdd/config.json"
  test -f "$config" || exit 0
  grep -q '"debug_log"[[:space:]]*:[[:space:]]*true' "$config" || exit 0

  # --- destino: SIEMPRE la carpeta de una tarea (CA-4) -----------------------
  # La tarea es la que esté en `in-progress` y, si no hay ninguna, la última
  # actualizada del índice (`updatedAt`; con empate, el `id` más alto).
  # `.sdd/debug/` queda solo para el índice sin tareas: en la corrida real la
  # tarea estaba en `draft` y los archivos terminaban sueltos ahí, donde el dev
  # no los encontró.
  #
  # index.json es JSON indentado y cada entrada abre con su propia línea `{`:
  # se acumulan los campos de la entrada y se la cierra al abrir la siguiente.
  # Un índice en una sola línea no matchea y el destino degrada al global.
  #
  # Sale un solo valor: la tarea destino. Es también la que mide el desglose del
  # paso 6 — si el archivo se escribe en la carpeta de la 007, el desglose habla
  # de los artefactos de la 007 y no de los de otra.
  base=".sdd/debug"
  index=".sdd/tasks/index.json"
  dest_dir=""   # tarea destino: la in-progress, si no la última actualizada
  if test -f "$index"; then
    sel=$(awk '
      # Valor string del campo de esta línea: "clave": "v", -> v
      function campo(line,   v) {
        v = line
        sub(/^[^:]*:[ \t]*"/, "", v)
        sub(/".*$/, "", v)
        return v
      }

      # Cierra la entrada acumulada: se queda con la primera in-progress y, en
      # paralelo, con la más reciente por updatedAt (empate: id más alto).
      function guardar(   n1, n2) {
        if (d == "") return
        if (s == "in-progress" && ip == "") ip = d
        if (best == "") { best = d; bu = u; bid = id; return }
        n1 = id + 0; n2 = bid + 0
        if (u > bu || (u == bu && (n1 > n2 || (n1 == n2 && id > bid)))) {
          best = d; bu = u; bid = id
        }
      }

      /^[ \t]*[{]/               { guardar(); d = ""; s = ""; u = ""; id = ""; next }
      /"dir"[ \t]*:/             { d = campo($0);  next }
      /"status"[ \t]*:/          { s = campo($0);  next }
      /"updatedAt"[ \t]*:/       { u = campo($0);  next }
      /"id"[ \t]*:/              { id = campo($0); next }

      END {
        guardar()
        print (ip != "" ? ip : best)
      }
    ' "$index" 2>/dev/null)
    dest_dir=$(printf '%s\n' "$sel" | sed -n 1p)
    if test -n "$dest_dir" && test -d ".sdd/tasks/$dest_dir"; then
      base=".sdd/tasks/$dest_dir/debug"
    fi
  fi

  # --- identidad del agente y nombre del archivo -----------------------------
  test -n "$event" || event=$(json_str hook_event_name)

  session_id=$(json_str session_id)
  transcript=$(json_str transcript_path)
  agent_id=$(json_str agent_id)
  agent_type=$(json_str agent_type)
  tool_use_id=$(json_str tool_use_id)
  tool_name=$(json_str tool_name)
  hook_model=$(json_str model)

  # --- completado del inicio del principal (CA-12, CA-11) --------------------
  # Cuando el agente principal arranca, su transcript todavía no tiene ningún
  # registro de uso: en el SessionStart no hay número exacto que leer y el
  # archivo de inicio sale solo con la estimación. Acá lo completamos en la
  # primera corrida posterior de cualquier hook que encuentre el transcript ya
  # con registros.
  #
  # Los números son los de la PRIMERA llamada del transcript —el contexto de
  # arranque real— y no los del momento en que se completa. Es idempotente: si
  # el archivo ya tiene su sección exacta no se lo vuelve a tocar, así que no
  # hay renglones duplicados. Si el archivo no existe, o el transcript sigue
  # sin registros, no pasa nada (CA-8).
  completar_inicio_principal() {
    c_ini="$base/principal-inicio.md"
    test -f "$c_ini" || return 0
    grep -q '^## Contexto medido' "$c_ini" && return 0
    test -n "$transcript" || return 0
    test -f "$transcript" || return 0
    test -s "$transcript" || return 0

    # La sección se arma en un archivo aparte, al lado del que se completa: un
    # `awk -v` con saltos de línea adentro lo rechaza el awk de macOS.
    c_tmp="$c_ini.tmp.$$"
    c_blk="$c_ini.blk.$$"

    awk '
      function num(line, key,   s) {
        if (!match(line, "\"" key "\"[ \t]*:[ \t]*[0-9]+")) return 0
        s = substr(line, RSTART, RLENGTH)
        sub(/^[^:]*:[ \t]*/, "", s)
        return s + 0
      }

      function str(line, key,   s) {
        if (!match(line, "\"" key "\"[ \t]*:[ \t]*\"[^\"]*\"")) return ""
        s = substr(line, RSTART, RLENGTH)
        sub(/^[^:]*:[ \t]*"/, "", s)
        sub(/"$/, "", s)
        return s
      }

      # Solo la primera llamada: es el contexto con el que arrancó de verdad.
      /"usage"[ \t]*:/ {
        if (!match($0, "\"input_tokens\"[ \t]*:[ \t]*[0-9]+")) next
        f_in = num($0, "input_tokens")
        f_crea = num($0, "cache_creation_input_tokens")
        f_lee = num($0, "cache_read_input_tokens")
        modelo = str($0, "model")

        print "## Contexto medido (exacto, del transcript)"
        print ""
        if (modelo != "") printf "- Modelo: %s\n", modelo
        printf "- Contexto de arranque: %d tokens (input %d + cache_creation %d + cache_read %d)\n", \
          f_in + f_crea + f_lee, f_in, f_crea, f_lee
        print "- Nota: al arrancar la sesión el transcript todavía no tenía registros de uso; estos números son los de la primera llamada del transcript y se completaron en la primera corrida posterior de un hook (CA-12)."
        exit
      }
    ' "$transcript" > "$c_blk" 2>/dev/null

    # Transcript todavía sin registros de uso: no hay nada que completar y no se
    # toca el archivo (CA-8).
    test -s "$c_blk" || { rm -f "$c_blk"; return 0; }

    # Reescritura por temporal + mv en el mismo directorio: si algo falla, el
    # archivo original queda intacto. La sección va antes del primer encabezado
    # de sección, que es donde la habría escrito el SessionStart.
    awk -v blk="$c_blk" '
      function volcar(   l) {
        while ((getline l < blk) > 0) print l
        close(blk)
      }
      !puesto && /^## / { volcar(); print ""; puesto = 1 }
      { print }
      END { if (!puesto) volcar() }
    ' "$c_ini" > "$c_tmp" 2>/dev/null || { rm -f "$c_tmp" "$c_blk"; return 0; }

    rm -f "$c_blk"
    test -s "$c_tmp" || { rm -f "$c_tmp"; return 0; }
    mv "$c_tmp" "$c_ini" 2>/dev/null || rm -f "$c_tmp"
    return 0
  }

  # Todo hook que no sea el SessionStart es una "corrida posterior": el
  # SessionStart escribe el archivo, los demás lo completan. Va antes de los
  # cortes por evento para que también complete cuando el hook actual no
  # escribe ningún archivo propio (un PreToolUse que no es Task, por ejemplo).
  test "$event" = "SessionStart" || completar_inicio_principal

  # paso 7 (primera parte): un solo pase del transcript en el SubagentStop.
  #
  # Resuelve dos cosas a la vez porque las dos hacen falta antes de escribir: el
  # tool_use_id del worker —para que su archivo de fin se llame igual que el de
  # inicio— y los números del transcript de la sesión.
  #
  # El problema del apareo: el PreToolUse conoce el tool_use_id de la llamada
  # que lanzó al worker y el SubagentStop conoce el agent_id, que son
  # identificadores distintos. Con varios workers en paralelo, dos archivos con
  # nombres distintos no se aparean. Se intenta resolver el tool_use_id por dos
  # caminos, en este orden:
  #
  #   ligado — alguna línea del transcript trae el agent_id junto a un único
  #            tool_use de subagente: la liga es explícita.
  #   unico  — hay un solo tool_use de subagente en todo el transcript: no hay
  #            con qué confundirlo.
  #
  # "tool_use de subagente" son los tres nombres con los que el runtime lanza
  # uno: `Agent` (el actual), `Task` (el histórico) y `Skill` (el camino por el
  # que salió el worker en la corrida real de tinku).
  #
  # Si ninguno aplica (varios candidatos, o un transcript que no los tiene), NO
  # se inventa la correspondencia: el archivo de fin se nombra con el agent_id y
  # declara adentro que el apareo es por orden y marca temporal (lo escribe
  # seccion_subagente).
  #
  # Los números salen del mismo pase por duplicado: los de las entradas
  # "isSidechain":true —las del worker dentro del transcript de quien lo
  # lanzó— y los del transcript entero. Cuál se usa lo decide la cascada de
  # abajo; acá no se etiqueta nada.
  pase_subagente() {
    test -n "$transcript" || return 0
    test -f "$transcript" || return 0
    test -s "$transcript" || return 0

    awk -v aid="$agent_id" '
      function num(line, key,   s) {
        if (!match(line, "\"" key "\"[ \t]*:[ \t]*[0-9]+")) return 0
        s = substr(line, RSTART, RLENGTH)
        sub(/^[^:]*:[ \t]*/, "", s)
        return s + 0
      }

      # Todos los ids toolu_* de la línea. Son varios cuando el mismo turno
      # lanza workers en paralelo, que es justo el caso ambiguo.
      function ids(line, out,   c) {
        c = 0
        while (match(line, /"toolu_[A-Za-z0-9_-]+"/)) {
          out[++c] = substr(line, RSTART + 1, RLENGTH - 2)
          line = substr(line, RSTART + RLENGTH)
        }
        return c
      }

      {
        if ($0 ~ /"name"[ \t]*:[ \t]*"(Agent|Task|Skill)"/) {
          c = ids($0, arr)
          for (i = 1; i <= c; i++)
            if (!(arr[i] in visto)) { visto[arr[i]] = 1; n_task++; ultimo = arr[i] }
          if (aid != "" && c == 1 && index($0, aid) > 0 && !(arr[1] in ligado)) {
            ligado[arr[1]] = 1
            n_ligado++
            cual = arr[1]
          }
        }

        if ($0 !~ /"usage"[ \t]*:/) next
        if (!match($0, "\"input_tokens\"[ \t]*:[ \t]*[0-9]+")) next
        t = num($0, "input_tokens") \
          + num($0, "cache_creation_input_tokens") \
          + num($0, "cache_read_input_tokens")
        n_todo++
        if (n_todo == 1) f_todo = t
        u_todo = t
        if ($0 ~ /"isSidechain"[ \t]*:[ \t]*true/) {
          n_side++
          if (n_side == 1) f_side = t
          u_side = t
        }
      }

      END {
        metodo = "-"; tuid = "-"
        if (n_ligado == 1)                   { metodo = "ligado"; tuid = cual }
        else if (n_ligado == 0 && n_task == 1) { metodo = "unico"; tuid = ultimo }

        printf "%s %s %d %d %d %d %d %d\n", metodo, tuid, \
          n_side + 0, f_side + 0, u_side + 0, \
          n_todo + 0, f_todo + 0, u_todo + 0
      }
    ' "$transcript" 2>/dev/null
  }

  # Números de un transcript cualquiera: llamadas, primera, última y delta.
  # Vacío si el archivo no tiene ningún registro `usage` con la forma esperada.
  pase_uso() { # $1=ruta
    test -f "$1" || return 0
    test -s "$1" || return 0
    awk '
      function num(line, key,   s) {
        if (!match(line, "\"" key "\"[ \t]*:[ \t]*[0-9]+")) return 0
        s = substr(line, RSTART, RLENGTH)
        sub(/^[^:]*:[ \t]*/, "", s)
        return s + 0
      }
      /"usage"[ \t]*:/ {
        if (!match($0, "\"input_tokens\"[ \t]*:[ \t]*[0-9]+")) next
        t = num($0, "input_tokens") \
          + num($0, "cache_creation_input_tokens") \
          + num($0, "cache_read_input_tokens")
        n++
        if (n == 1) f = t
        u = t
      }
      END {
        if (n == 0) exit 0
        printf "%d %d %d %d\n", n, f, u, u - f
      }
    ' "$1" 2>/dev/null
  }

  # --- transcript propio del worker (S-2) ------------------------------------
  # El `transcript_path` que llega en el SubagentStop es el de la sesión que
  # lanzó al worker, no el del worker: en la corrida real de tinku ese archivo
  # no tenía ni una entrada sidechain, así que la heurística "sin sidechain ⇒ es
  # el transcript propio" le atribuía al worker los 38561 → 65851 del principal.
  #
  # Mientras la sesión corre puede existir, además, un archivo por agente bajo
  # un directorio temporal de la sesión con forma
  # `<tmp>/<slug del proyecto>/<session_id>/tasks/<agent_id>*`. Puede no estar
  # (en esa misma corrida el directorio quedó vacío al terminar), así que se lo
  # busca con globs acotados —nada de `find` recursivo— y si no aparece, no pasa
  # nada: la cascada de abajo se queda con la base que sí se pueda sostener.
  transcript_worker() {
    test -n "$agent_id" || return 0
    test -n "$session_id" || return 0
    # Nada que venga del payload arma una ruta si no es alfanumérico.
    case "$agent_id" in ""|*[!A-Za-z0-9_-]*) return 0 ;; esac
    case "$session_id" in ""|*[!A-Za-z0-9_-]*) return 0 ;; esac

    for w_raiz in "${TMPDIR:-}" /tmp /private/tmp; do
      test -n "$w_raiz" || continue
      test -d "$w_raiz" || continue
      w_raiz=${w_raiz%/}
      for w_c in \
        "$w_raiz/$session_id/tasks/$agent_id"* \
        "$w_raiz"/*/"$session_id/tasks/$agent_id"* \
        "$w_raiz"/*/*/"$session_id/tasks/$agent_id"*
      do
        test -e "$w_c" || continue
        if test -d "$w_c"; then
          for w_f in "$w_c"/*; do
            test -f "$w_f" || continue
            grep -q '"usage"' "$w_f" 2>/dev/null || continue
            printf '%s\n' "$w_f"
            return 0
          done
          continue
        fi
        test -f "$w_c" || continue
        grep -q '"usage"' "$w_c" 2>/dev/null || continue
        printf '%s\n' "$w_c"
        return 0
      done
    done
    return 0
  }

  apareo_metodo=""
  tool_use_id_fin=""
  d_base=""
  d_ruta=""
  d_n=0; d_f=0; d_u=0; d_d=0
  if test "$event" = "SubagentStop"; then
    sub_datos=$(pase_subagente)
    if test -n "$sub_datos"; then
      # Valores fabricados por el awk de arriba: alfanuméricos y sin espacios.
      set -- $sub_datos
      apareo_metodo="$1"
      tool_use_id_fin="$2"
      n_side="$3"; f_side="$4"; u_side="$5"
      n_todo="$6"; f_todo="$7"; u_todo="$8"
      test "$apareo_metodo" = "-" && apareo_metodo=""
      # Nunca dejamos que un valor del transcript arme una ruta si no tiene la
      # forma de un tool_use_id.
      case "$tool_use_id_fin" in
        toolu_*) ;;
        *) tool_use_id_fin=""; apareo_metodo="" ;;
      esac
    else
      n_side=0; f_side=0; u_side=0
      n_todo=0; f_todo=0; u_todo=0
    fi

    # Cascada de bases, en orden de preferencia. La regla es una sola: NUNCA se
    # etiqueta como "propio del subagente" un número que no se pudo aislar.
    #
    #   1. transcript propio del worker, si existe y tiene registros de uso;
    #   2. entradas sidechain de la sesión, si las hay;
    #   3. los números de la sesión, declarados COMO de la sesión (S-2).
    w_ruta=$(transcript_worker)
    if test -n "$w_ruta"; then
      w_datos=$(pase_uso "$w_ruta")
      if test -n "$w_datos"; then
        set -- $w_datos
        d_base="propio"; d_ruta="$w_ruta"
        d_n="$1"; d_f="$2"; d_u="$3"; d_d="$4"
      fi
    fi
    if test -z "$d_base"; then
      if test "$n_side" -gt 0; then
        d_base="sidechain"
        d_n="$n_side"; d_f="$f_side"; d_u="$u_side"; d_d=$((u_side - f_side))
      elif test "$n_todo" -gt 0; then
        d_base="sesion"
        d_n="$n_todo"; d_f="$f_todo"; d_u="$u_todo"; d_d=$((u_todo - f_todo))
      fi
    fi
  fi

  # El PreToolUse que lanza un subagente es el arranque de un agente que todavía
  # no tiene agent_id: lo identificamos por el tool_use_id de la llamada que lo
  # lanza. El SubagentStop usa ese mismo tool_use_id si se pudo resolver, para
  # que los dos archivos del mismo worker se llamen igual.
  #
  # Tres nombres de tool lanzan un worker y los tres cuentan: `Agent` es el
  # actual, `Task` el histórico y `Skill` el camino por el que salió el
  # subagente en la corrida real de tinku (el transcript no tenía un solo
  # tool_use llamado `Task`, y por eso no se escribió ningún archivo de inicio).
  # Cualquier otra tool sale sin escribir nada: el matcher de hooks.json filtra
  # lo mismo, para no pagar un hook en cada llamada a cada tool.
  case "$event" in
    SessionStart)  fase="inicio"; id="" ;;
    SessionEnd)    fase="fin";    id="$agent_id" ;;
    PreToolUse)    fase="inicio"; id="${tool_use_id:-$agent_id}"
                   case "$tool_name" in
                     Agent|Task|Skill) ;;
                     *) exit 0 ;;
                   esac ;;
    SubagentStop)  fase="fin";    id="${tool_use_id_fin:-${agent_id:-$tool_use_id}}" ;;
    *)             exit 0 ;;
  esac

  if test -n "$id"; then
    who="subagente"
    file="$base/subagente-$(slug "$id")-$fase.md"
  else
    who="principal"
    file="$base/principal-$fase.md"
  fi

  # --- costuras de los pasos siguientes --------------------------------------
  # Cada una escribe su sección al final de "$file" (>> "$file"). Vacías por
  # ahora: el paso 4 solo construye el esqueleto.

  # paso 5: totales exactos del transcript — primera y última llamada,
  # input_tokens + cache_creation_input_tokens + cache_read_input_tokens (CA-5).
  #
  # El transcript es un JSONL que puede pesar megabytes: un solo pase de awk que
  # recuerda la primera y la última línea con `usage`, sin acumular el archivo en
  # memoria. Los números son exactos (los reporta el runtime), no estimados: el
  # desglose estimado es cosa del paso 6. Si no hay transcript, no existe, está
  # vacío o ninguna línea tiene la forma esperada, la sección no se escribe y el
  # archivo queda sin ese renglón (CA-8).
  seccion_totales() {
    test -n "$transcript" || return 0
    test -f "$transcript" || return 0
    test -s "$transcript" || return 0

    awk -v fase="$fase" '
      # Escalar numérico de la línea: "clave":123 -> 123, ausente -> 0.
      # "input_tokens" no matchea dentro de "cache_creation_input_tokens"
      # porque el patrón exige la comilla de apertura pegada a la clave.
      function num(line, key,   s) {
        if (!match(line, "\"" key "\"[ \t]*:[ \t]*[0-9]+")) return 0
        s = substr(line, RSTART, RLENGTH)
        sub(/^[^:]*:[ \t]*/, "", s)
        return s + 0
      }

      # Escalar string de la línea: "clave":"v" -> v, ausente -> "".
      function str(line, key,   s) {
        if (!match(line, "\"" key "\"[ \t]*:[ \t]*\"[^\"]*\"")) return ""
        s = substr(line, RSTART, RLENGTH)
        sub(/^[^:]*:[ \t]*"/, "", s)
        sub(/"$/, "", s)
        return s
      }

      # Una llamada al modelo = una línea con usage e input_tokens. Cualquier
      # otra forma se ignora en silencio.
      /"usage"[ \t]*:/ {
        if (!match($0, "\"input_tokens\"[ \t]*:[ \t]*[0-9]+")) next
        total = num($0, "input_tokens") \
              + num($0, "cache_creation_input_tokens") \
              + num($0, "cache_read_input_tokens")
        salida += num($0, "output_tokens")
        n++
        if (n == 1) {
          f_in = num($0, "input_tokens")
          f_crea = num($0, "cache_creation_input_tokens")
          f_lee = num($0, "cache_read_input_tokens")
          f_total = total
          f_modelo = str($0, "model")
        }
        u_in = num($0, "input_tokens")
        u_crea = num($0, "cache_creation_input_tokens")
        u_lee = num($0, "cache_read_input_tokens")
        u_total = total
        u_modelo = str($0, "model")
      }

      END {
        if (n == 0) exit 0

        print "## Contexto medido (exacto, del transcript)"
        print ""

        # CA-11: el modelo que efectivamente corrió. Si cambió entre la primera
        # y la última llamada se reportan los dos: la discrepancia es el dato.
        if (f_modelo != "" && u_modelo != "" && f_modelo != u_modelo) {
          printf "- Modelo (primera llamada): %s\n", f_modelo
          printf "- Modelo (última llamada): %s\n", u_modelo
        } else if (f_modelo != "") {
          printf "- Modelo: %s\n", f_modelo
        } else if (u_modelo != "") {
          printf "- Modelo: %s\n", u_modelo
        }

        printf "- Llamadas al modelo: %d\n", n
        printf "- Contexto de arranque: %d tokens (input %d + cache_creation %d + cache_read %d)\n", \
          f_total, f_in, f_crea, f_lee

        if (fase == "fin") {
          printf "- Contexto de cierre: %d tokens (input %d + cache_creation %d + cache_read %d)\n", \
            u_total, u_in, u_crea, u_lee
          printf "- Crecimiento: %d tokens\n", u_total - f_total
          printf "- Output acumulado: %d tokens\n", salida
        }
        print ""
      }
    ' "$transcript" 2>/dev/null
  }

  # paso 6: desglose estimado por pieza (brief, archivos nombrados, artefactos)
  # + overhead fijo por resta (CA-6).
  #
  # El total del paso 5 es exacto pero opaco: no dice qué parte del gasto pone
  # sddkit. Acá se abre en renglones ESTIMADOS —el tamaño en bytes de cada pieza
  # dividido por bytes_por_token— y todo lo que no se puede atribuir queda en un
  # único renglón de "overhead fijo" obtenido por resta contra el total exacto:
  #
  #   overhead fijo = contexto de arranque exacto - suma de las piezas estimadas
  #
  # Ese resto es el system prompt + los schemas de las tools + los servidores MCP
  # + los archivos de memoria: no lo podemos desagregar y no fingimos que sí
  # (supuesto S-4 de la spec). El modelo lo reporta seccion_totales; acá no se
  # repite. Ningún renglón mezcla lo medido con lo estimado sin decir cuál es
  # cuál (S-3).
  #
  # bytes_por_token = 4: aproximación estándar para texto y código. Es una
  # constante declarada, no una medición.
  bytes_por_token=4

  bytes_de() { # $1=ruta -> tamaño en bytes, o falla si no es un archivo.
    # `wc -c` da el tamaño; nunca volcamos el contenido a ningún lado.
    test -f "$1" || return 1
    wc -c < "$1" 2>/dev/null | awk '{ print $1 + 0; salio = 1 } END { if (!salio) exit 1 }'
  }

  agregar() { # $1=renglón ya armado
    lineas="$lineas$1$salto"
    n_piezas=$((n_piezas + 1))
  }

  pieza() { # $1=ruta $2=etiqueta — no genera renglón si el archivo no existe.
    p_bytes=$(bytes_de "$1") || return 0
    p_tokens=$((p_bytes / bytes_por_token))
    agregar "- $2 (estimado): $p_bytes bytes, aprox. $p_tokens tokens"
    total_estimado=$((total_estimado + p_tokens))
  }

  seccion_desglose() {
    # Solo en el archivo de inicio: es el único que reporta un contexto de
    # arranque para explicar. El brief lo trae PreToolUse/Task; los archivos de
    # arranque del principal, SessionStart.
    test "$fase" = "inicio" || return 0

    salto='
'
    lineas=""
    n_piezas=0
    total_estimado=0

    if test "$who" = "subagente"; then
      # --- el brief que le mandamos al worker ---------------------------------
      # Viene en tool_input.prompt. Puede tener miles de caracteres, comillas y
      # saltos escapados: lo medimos, no lo volcamos. El tamaño incluye las
      # barras de escape del JSON, así que sobreestima un poco — es estimado.
      brief=$(printf '%s\n' "$payload" | awk '
        {
          if (!match($0, /"prompt"[ \t]*:[ \t]*"/)) next
          i = RSTART + RLENGTH
          n = length($0)
          esc = 0
          out = ""
          while (i <= n) {
            c = substr($0, i, 1)
            if (esc)             { out = out c; esc = 0 }
            else if (c == "\\")  { out = out c; esc = 1 }
            else if (c == "\"")  break
            else                   out = out c
            i++
          }
          print out
          exit
        }
      ' 2>/dev/null)

      if test -n "$brief"; then
        b_bytes=$(printf '%s' "$brief" | wc -c | awk '{ print $1 + 0 }')
        b_tokens=$((b_bytes / bytes_por_token))
        agregar "- Brief del paso (estimado): $b_bytes bytes, aprox. $b_tokens tokens"
        total_estimado=$((total_estimado + b_tokens))
      fi

      # --- los archivos que el brief nombra ----------------------------------
      # Son lo que ese worker va a leer por indicación nuestra. Se toman los
      # tokens con forma de ruta (barra + extensión) que existen en el repo; los
      # comodines quedan afuera porque el char class no incluye '*'.
      for ruta in $(printf '%s\n' "$brief" | awk '
        {
          s = $0
          gsub(/[^A-Za-z0-9._\/-]+/, "\n", s)
          n = split(s, a, "\n")
          for (i = 1; i <= n; i++) {
            p = a[i]
            sub(/[.,;:]+$/, "", p)
            if (p !~ /\//) continue
            if (p !~ /\.[A-Za-z0-9]+$/) continue
            if (visto[p]++) continue
            print p
          }
        }
      ' 2>/dev/null); do
        pieza "$ruta" "Archivo nombrado $ruta"
      done
    else
      # --- lo que sddkit le mete al principal al arrancar ---------------------
      pieza "CLAUDE.md" "CLAUDE.md"

      # Los .md que vuelcan los hooks de SessionStart, con las mismas condiciones
      # de hooks.json: solo cuenta lo que realmente se vuelca. bootstrap.md no
      # entra nunca acá, porque si llegamos hasta este punto config.json existe.
      hooks_dir="${CLAUDE_PLUGIN_ROOT:-}"
      if test -n "$hooks_dir" && test -d "$hooks_dir/hooks"; then
        hooks_dir="$hooks_dir/hooks"
      else
        hooks_dir=$(dirname "$0")
      fi

      if test -d .sdd &&
         ! command -v termaid >/dev/null 2>&1 &&
         ! grep -q '"termaid"' "$config" 2>/dev/null; then
        pieza "$hooks_dir/termaid.md" "Hook termaid.md"
      fi
      grep -q '"caveman"[[:space:]]*:[[:space:]]*"no"' "$config" 2>/dev/null ||
        pieza "$hooks_dir/caveman.md" "Hook caveman.md"

      # Los artefactos de la MISMA tarea en la que se escribe el archivo: la
      # in-progress si hay una, si no la última actualizada del índice. Medir
      # los de otra tarea sería describir un contexto que el agente no tiene.
      if test -n "${dest_dir:-}" && test -d ".sdd/tasks/$dest_dir"; then
        for art in requirement.md analysis.md spec.md design.md plan.md; do
          pieza ".sdd/tasks/$dest_dir/$art" "Artefacto $art"
        done
      fi
    fi

    # Ninguna pieza medible: no hay nada que desglosar y la sección no se
    # escribe (CA-8).
    test "$n_piezas" -gt 0 || return 0

    # Contexto de arranque exacto: primera línea del transcript con usage. Mismo
    # criterio que seccion_totales, pero cortando en la primera coincidencia.
    arranque=""
    if test -n "$transcript" && test -f "$transcript" && test -s "$transcript"; then
      arranque=$(awk '
        function num(line, key,   s) {
          if (!match(line, "\"" key "\"[ \t]*:[ \t]*[0-9]+")) return 0
          s = substr(line, RSTART, RLENGTH)
          sub(/^[^:]*:[ \t]*/, "", s)
          return s + 0
        }
        /"usage"[ \t]*:/ {
          if (!match($0, "\"input_tokens\"[ \t]*:[ \t]*[0-9]+")) next
          print num($0, "input_tokens") \
              + num($0, "cache_creation_input_tokens") \
              + num($0, "cache_read_input_tokens")
          exit
        }
      ' "$transcript" 2>/dev/null)
    fi

    printf '%s\n' "## Desglose estimado (por bytes, aprox. $bytes_por_token bytes por token)"
    printf '\n'
    printf '%s' "$lineas"
    printf '%s\n' "- Subtotal piezas propias (estimado): $total_estimado tokens"

    # Sin total exacto no hay resta posible: el overhead simplemente no se
    # reporta, en vez de inventar un número (CA-8).
    if test -n "$arranque"; then
      if test "$arranque" -ge "$total_estimado"; then
        printf '%s\n' "- overhead fijo (estimado por resta: total exacto $arranque menos piezas estimadas $total_estimado): $((arranque - total_estimado)) tokens"
      else
        printf '%s\n' "- overhead fijo (estimado por resta): 0 tokens, la estimación de las piezas ($total_estimado) excedió el total exacto ($arranque)"
      fi
    fi
    printf '\n'
  }

  # paso 7: nivel pedido por el plan y brief mandado al subagente en el inicio;
  # delta de contexto en el fin (CA-1, CA-2, CA-3, CA-11).
  #
  # Solo para subagentes: el agente principal no lo lanza nadie con un nivel.
  # Nada de lo que escribe acá lo escriben las secciones de arriba — el modelo
  # que EFECTIVAMENTE corrió lo saca seccion_totales del transcript, y lo que se
  # agrega acá es lo que se PIDIÓ. Los dos renglones conviven sin traducirse uno
  # al otro: la gracia es poder compararlos.
  s_agregar() { # $1=renglón ya armado
    s_lineas="$s_lineas$1$s_salto"
    s_n=$((s_n + 1))
  }

  seccion_subagente() {
    test "$who" = "subagente" || return 0

    s_salto='
'
    s_lineas=""
    s_n=0

    if test "$fase" = "inicio" && test "$tool_name" = "Skill"; then
      # --- el worker salió por una Skill (CA-3) -------------------------------
      # El tool_input de `Skill` tiene otra forma: `skill` y `args`, sin prompt
      # ni model. No hay brief que medir ni alias de modelo que mapear a un
      # nivel, así que no se inventa ninguno de los dos: se registra la skill y
      # sus args recortados, que es lo que el payload sí trae.
      s_skill=$(json_str skill | sed 's/[[:cntrl:]]/ /g' | cut -c1-80)
      s_args=$(json_str args | sed 's/[[:cntrl:]]/ /g' | cut -c1-120)

      test -n "$s_skill" && s_agregar "- Skill que lanzó al subagente: $s_skill"
      test -n "$s_args" && s_agregar "- Args de la skill (recortados): $s_args"
      test -n "$tool_use_id" && s_agregar "- Tool use id: $tool_use_id"
      s_agregar "- El payload de Skill no trae brief ni alias de modelo pedido: no se reporta ninguno de los dos. El modelo que efectivamente corrió lo dice el contexto medido (CA-11)."
      s_agregar "- Apareo con el archivo de fin: por tool_use_id si el fin logra resolverlo, si no por orden y marca temporal."

      test "$s_n" -gt 0 || return 0
      printf '%s\n' "## Subagente lanzado (lo que pidió el plan)"
      printf '\n'
      printf '%s' "$s_lineas"
      printf '\n'
      return 0
    fi

    if test "$fase" = "inicio"; then
      # --- lo que el plan pidió (CA-3, CA-11) ---------------------------------
      # Viene del tool_input del PreToolUse de `Agent`/`Task`: subagent_type,
      # model (el alias) y description. El brief entero no se vuelca: el paso 6
      # lo mide y acá va, a lo sumo, la etiqueta corta del paso.
      s_tipo=$(json_str subagent_type)
      s_modelo=$(json_str model)
      s_desc=$(json_str description | sed 's/[[:cntrl:]]/ /g' | cut -c1-80)

      # Nivel del plan: la clave de `models` en config.json que apunta a ese
      # alias. Si el paso pidió un id de modelo completo, o config no lo tiene,
      # el renglón no se escribe: no se inventa un nivel (CA-8).
      s_nivel=""
      if test -n "$s_modelo"; then
        s_limpio=$(printf '%s' "$s_modelo" | sed 's/[^A-Za-z0-9_.:-]//g')
        if test "$s_limpio" = "$s_modelo"; then
          s_nivel=$(awk -v alias="$s_modelo" '
            BEGIN { split("rapido medio fuerte", nivel, " ") }
            {
              for (i = 1; i <= 3; i++)
                if ($0 ~ "\"" nivel[i] "\"[ \t]*:[ \t]*\"" alias "\"") {
                  print nivel[i]
                  exit
                }
            }
          ' "$config" 2>/dev/null)
        fi
      fi

      test -n "$s_tipo" && s_agregar "- Tipo de subagente pedido: $s_tipo"
      if test -n "$s_modelo"; then
        # "Alias de modelo pedido" y no "Modelo": el renglón `- Modelo` es del
        # que efectivamente corrió, y son dos cosas distintas.
        s_agregar "- Alias de modelo pedido: $s_modelo"
        test -n "$s_nivel" && s_agregar "- Nivel del plan: $s_nivel (según $config → models)"
        s_agregar "- El modelo que efectivamente corrió lo reporta el contexto medido: si no coincide con el pedido, esa diferencia es el dato (CA-11)."
      fi
      test -n "$s_desc" && s_agregar "- Paso: $s_desc"
      test -n "$tool_use_id" && s_agregar "- Tool use id: $tool_use_id"
      s_agregar "- Apareo con el archivo de fin: por tool_use_id si el fin logra resolverlo, si no por orden y marca temporal."

      test "$s_n" -gt 0 || return 0
      printf '%s\n' "## Subagente lanzado (lo que pidió el plan)"
      printf '\n'
      printf '%s' "$s_lineas"
      printf '\n'
      return 0
    fi

    # --- fin del worker (CA-2) -------------------------------------------------
    # Los dos identificadores van adentro del archivo aunque el nombre use uno
    # solo, y el apareo se declara: si quedó por orden y marca temporal se dice,
    # no se disimula.
    test -n "$agent_id" && s_agregar "- Agent id: $agent_id"
    if test -n "$tool_use_id_fin"; then
      s_agregar "- Tool use id: $tool_use_id_fin"
      if test "$apareo_metodo" = "ligado"; then
        s_agregar "- Apareo con el archivo de inicio: por tool_use_id, que el transcript liga con el agent_id (los dos archivos se llaman igual)."
      else
        s_agregar "- Apareo con el archivo de inicio: por tool_use_id, único tool_use de subagente (Agent/Task/Skill) del transcript (los dos archivos se llaman igual)."
      fi
    else
      test -n "$tool_use_id" && s_agregar "- Tool use id: $tool_use_id"
      s_agregar "- Apareo con el archivo de inicio: por orden y marca temporal, no por identificador — el SubagentStop trae agent_id, el PreToolUse traía tool_use_id y el transcript no los liga sin ambigüedad."
    fi

    # La base de los números va SIEMPRE declarada, y los renglones cambian de
    # sujeto con ella: cuando no se pudo aislar al worker, los números son de la
    # sesión y se los nombra así, en vez de atribuírselos a él (S-2).
    if test "$d_base" = "propio"; then
      s_base="transcript propio del subagente"
      s_agregar "- Base de los números: $s_base"
      test -n "$d_ruta" && s_agregar "- Transcript propio del subagente: $d_ruta"
      s_agregar "- Contexto de arranque del subagente: $d_f tokens (base: $s_base)"
      s_agregar "- Contexto de cierre del subagente: $d_u tokens (base: $s_base)"
      s_agregar "- Llamadas del subagente: $d_n"
      s_agregar "- Crecimiento del subagente: $d_d tokens (base: $s_base)"
    elif test "$d_base" = "sidechain"; then
      s_base="entradas sidechain de la sesión"
      s_agregar "- Base de los números: $s_base"
      s_agregar "- Contexto de arranque del subagente: $d_f tokens (base: $s_base)"
      s_agregar "- Contexto de cierre del subagente: $d_u tokens (base: $s_base)"
      s_agregar "- Llamadas del subagente: $d_n"
      s_agregar "- Crecimiento del subagente: $d_d tokens (base: $s_base)"
      s_agregar "- El transcript es el de la sesión que lanzó al worker: los números salen solo de sus entradas sidechain, que pueden incluir a otros workers en paralelo."
    elif test "$d_base" = "sesion"; then
      s_base="transcript de la sesión que lo lanzó (no fue posible aislar al subagente)"
      s_agregar "- Base de los números: $s_base"
      s_agregar "- Contexto de arranque de la sesión: $d_f tokens (base: $s_base)"
      s_agregar "- Contexto de cierre de la sesión: $d_u tokens (base: $s_base)"
      s_agregar "- Llamadas de la sesión: $d_n"
      s_agregar "- Crecimiento de la sesión: $d_d tokens (base: $s_base)"
      s_agregar "- Estos números NO son atribuibles al subagente: son los de la sesión que lo lanzó. No se encontró su transcript propio ni entradas sidechain con las que aislarlo (S-2)."
    fi

    test "$s_n" -gt 0 || return 0
    printf '%s\n' "## Subagente terminado"
    printf '\n'
    printf '%s' "$s_lineas"
    printf '\n'
  }

  # --- escritura -------------------------------------------------------------
  mkdir -p "$base" || exit 0

  # printf con formato '%s\n': un formato que arranca con '-' lo toman algunos
  # shells como opción propia.
  {
    printf '# Contexto del agente %s — %s\n\n' "$who" "$fase"
    printf '%s\n' "- Fecha: $(date +%Y-%m-%dT%H:%M:%S)"
    printf '%s\n' "- Evento: $event"
    test -n "$session_id" && printf '%s\n' "- Sesión: $session_id"
    test -n "$id" && printf '%s\n' "- Agente: $id"
    test -n "$agent_type" && printf '%s\n' "- Tipo de agente: $agent_type"
    test -n "$transcript" && printf '%s\n' "- Transcript: $transcript"
    # Modelo del payload: en el SessionStart el transcript todavía no dice nada
    # y este es el único dato que hay. Es provisorio y se declara como tal — el
    # renglón `- Modelo` es siempre el que confirma el transcript (CA-11), así
    # que los dos conviven sin pisarse.
    test "$who" = "principal" && test -n "$hook_model" &&
      printf '%s\n' "- Modelo informado por el hook (provisorio, lo confirma el transcript): $hook_model"
    printf '\n'
  } > "$file" || exit 0

  seccion_totales >> "$file"
  seccion_desglose >> "$file"
  seccion_subagente >> "$file"
} 2>/dev/null 1>&2

exit 0
