# Aprendizajes del proyecto

> Memoria curada del repo, escrita al cerrar cada tarea (BR-086). **Los agentes DEBEN leer este archivo antes de implementar.**

> Reglas de curado (responsabilidad del agente que cierra): entradas accionables y específicas, nunca genéricas; fusionar las similares; podar las obsoletas; **máximo ~30 entradas**, **cada bullet ≤ 200 caracteres** — condensá, no narres.

## Sobre el framework y sus documentos

- **Los ejemplos de las skills fijan el estándar que el agente copia**: para cambiar el estilo o el largo de la salida, recortá los ejemplos y templates, no solo las instrucciones. _(tarea 011)_
- **Un `cmd:` de "no aparece X" falla si el doc declara X obsoleto**: para eso tiene que nombrarlo. Verificá la presencia de lo nuevo. _(tarea 021)_
- **Presupuestos en palabras no predicen si un documento entra en pantalla**: medí en líneas. Los topes en palabras se incumplieron en 7 de 7 analysis del repo. _(tarea 021)_
- **Strings citados literalmente en `domain.md` son contrato**: verificalos carácter por carácter, no solo "misma idea" — una variante equivalente puede romper el contrato. _(tarea 002)_
- **Si una tarea modifica una skill usada en la misma sesión, tenés la versión vieja cargada**: seguí el flujo ya conocido en vez de depender de que recargue. _(tareas 006, 021)_
- **El bloque gestionado de `CLAUDE.md` vive cerca de su tope práctico (~450 palabras)**: agregar una instrucción obliga a reescribir otra, no a sumar. _(tarea 018)_
- **Acortar una respuesta no la hace legible**: 150 palabras llenas de códigos propios del agente (`Z3`, `BR-004`) son ilegibles igual. Traducir la jerga es parte de resumir. _(tarea 018)_
- **Un doc que se declara `PLACEHOLDER` queda inerte**: el agente lo lee como instrucciones incompletas y sigue de largo. Si el contrato ya está fijado, escribí el texto. _(tarea 024)_
- **Un ofrecimiento sin momento fijado se difiere hasta el final y el dev no lo ve**: en una instrucción al agente, el *cuándo* pesa tanto como el *qué*. _(tarea 024)_
- **Triggers de skills por lista cerrada de keywords son frágiles en español**: incluí siempre un fallback de "preguntar al dev" cuando el clasificador no esté seguro. _(tarea 002)_

- **Agregar una fila a `components.md` suele pasar el tope de 45 líneas**: colapsá aristas del Mermaid con `&` (`a & b --> c`) antes de recortar contenido. _(tarea 023)_

## Sobre el flujo de trabajo

- **El PR (o artefacto "cerrable") debe ser el ÚLTIMO paso**: crearlo antes de commitear los aprendizajes deja artefactos de cierre huérfanos tras el merge. _(tarea 007)_
- **Al escribir el plan, recalculá los conteos que después son una verificación exacta**: un valor "razonable" a ojo puede no coincidir con el real. _(tarea 003)_
- **Un plan que no entra en 45 líneas es señal de tarea demasiado grande**, no de un plan detallado. Partila. _(tarea 021)_
- **Menos documentos, no más** (Böckeler sobre Kiro y spec-kit): inflan un pedido chico en artefactos que nadie lee, y el agente termina ignorando su propia investigación. _(tarea 021)_

## Sobre la arquitectura del plugin

- **No declares `skills` ni `hooks` en `plugin.json`**: `skills/` y `hooks/hooks.json` se cargan por convención y declararlos los duplica ("Duplicate hooks file detected"). _(tarea 021)_
- **`claude plugin validate <dir>` valida el marketplace si hay ambos manifiestos**: para validar el plugin, copiá `plugin.json` solo a otro directorio. _(tarea 021)_
- **En hooks, la variable va como `"${CLAUDE_PLUGIN_ROOT}"`** — con llaves y entre comillas. Sin llaves puede no sustituirse. _(tarea 021)_
- **Un plugin de Claude Code no puede instalar dependencias**: es markdown y JSON, y su único punto de ejecución es el one-liner de un hook. Todo lo demás lo ejecuta el dev. _(tarea 021)_
- **Degradación elegante > error bloqueante**: para herramientas externas opcionales (`gh`/`glab`/`az`, `termaid`), detectá disponibilidad, usá si existe, degradá si no. _(tareas 010, 021)_
- **Persistí también la respuesta negativa**: un ofrecimiento que solo recuerda el "sí" vuelve a molestar en cada sesión. _(tarea 021)_
- **Versionar configuración desde el inicio**: un histórico `{versions:[...], active: idx}` desde v1 es más fácil que agregarlo después. Ver `.sdd/branching.md`. _(tarea 010)_
- **Sin exit codes, el gate es el agente**: al eliminar una verificación automática, escribí explícitamente quién la sostiene ahora y bajo qué condición se revierte. _(tarea 020)_
- **Una skill no se carga sola**: para un comportamiento siempre activo hace falta un hook `SessionStart` que inyecte la instrucción; la `description` del SKILL.md no lo garantiza. _(tarea 023)_
- **Un `_nota` de `config.json` que cita el flag que un hook grepea puede autosilenciarlo**: probá el one-liner contra el archivo real, no solo contra un fixture. _(tarea 023)_
