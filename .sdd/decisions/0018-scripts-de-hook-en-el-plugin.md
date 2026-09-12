# ADR 0018 — el plugin vuelve a tener un script ejecutable, invocado desde sus hooks

- **Fecha:** 2026-09-03 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/025-estamos-con-un-problema-actualmente-las

## Contexto

ADR-0016 eliminó el CLI y dejó al plugin como markdown + JSON, con el one-liner de cada hook como único punto de ejecución. Su sección de alternativas descartó explícitamente "scripts sueltos en el plugin" — no por ser incorrecta, sino "por ahora, no por ser incorrecta: se prefiere partir de cero y reconstruir sólo lo que la práctica demuestre necesario". Su condición de reversión nombró el camino de vuelta: reintroducir capacidades "como scripts invocados desde hooks del plugin (`PreToolUse`, `Stop`) — no como un CLI que el dev deba instalar".

La tarea 025 necesita medir el gasto real de contexto por agente (arranque y cierre, con desglose) para diagnosticar consumo excesivo. Ese dato — el tamaño exacto del contexto — no es observable por el agente: vive en el transcript, fuera de lo que un SKILL.md puede leer u ordenar escribir.

## Decisión

Se toma el camino de reversión que ADR-0016 dejó abierto, para la instrumentación de contexto. El plugin suma `hooks/debug-context.sh`, invocado por sus propios hooks (no por el dev), escrito en POSIX `sh` con `grep`/`sed`/`awk`. No se agrega ninguna runtime: nada de `jq`, Node ni Python — BR-079 sigue intacta.

## Alternativas consideradas

- **Que el agente escriba los archivos de debug siguiendo una instrucción en un SKILL.md.** Descartada: el dato que hace falta —el tamaño real del contexto— el agente no lo puede ver; vive en el transcript, no en lo que el modelo procesa.
- **Reintroducir un CLI o un paquete instalable.** Descartada por BR-079: sddkit no exige Node ni ningún paso manual de instalación.
- **Pedirle al dev que corra `/context` y pegue la salida.** Descartada: no es automatizable ni reproducible por agente, y depende de que el dev se acuerde de hacerlo.

## Consecuencias

**Se gana:** medición real del gasto de contexto por agente (inicio y fin, con desglose estimado), sin ninguna intervención del dev — se dispara solo desde los hooks.

**Se sacrifica:** el plugin vuelve a tener código ejecutable, con su propia superficie de bugs, y una dependencia de shell POSIX que el markdown puro no tenía. En Windows nativo sin shell POSIX el script no corre y degrada a no escribir nada: sin instrumentación, pero sin romper la sesión.

El script no puede volverse caro ni ruidoso: nunca escribe en stdout ni stderr, porque contaminaría el propio contexto que mide.
