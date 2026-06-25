# Analysis — tarea 006: Ajustar el flujo post-ejecución SDD para que: (1) los worker…

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de especificar.

## Análisis crítico

> El requisito del dev es una HIPÓTESIS, no una orden. El dev puede equivocarse: cuestionalo antes de refinarlo. El valor de esta sección es el desacuerdo fundado, no la complacencia.

- **¿Qué problema real resuelve?** El flujo actual va de "todos los pasos verificados automáticamente" directo a commit → push → PR (vía `sdd-close`), sin un momento donde el dev pruebe manualmente los cambios. Las verificaciones automáticas (`sdd task verify`) validan corrección de código (tests pasan, archivos existen), pero no corrección de la feature tal como la experimenta el usuario. Esto genera PRs prematuros con fixes-de-fixes y el dev pierde visibilidad de los diffs limpios antes de que se commiteen.

- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?** No. `sdd task verify` (verificación por paso) es lo más cercano, pero es automatizado — corre un comando y chequea exit code. No hay ninguna instrucción en las skills que guíe al dev a probar localmente ni que pause antes de commitear.

- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?** Esto YA es la versión simple: el cambio es puramente documental (4 archivos de skills, 0 archivos de código fuente de sddkit). No hay lógica nueva que implementar — solo instrucciones al agente. Opción B del brainstorm previo (guiado según tipo de cambio) es el sweet spot.

- **Supuestos del dev que podrían no ser ciertos:**
  1. "Los workers hacen commit al implementar" — en realidad, Claude Code dice "Only create commits when requested by the user" en su system prompt. El commit no lo hacen los workers sino el orquestador/agente principal al cerrar, porque `sdd-close` espera rama pusheada. Pero en la práctica, el agente tiende a commitear como parte del cierre del ciclo. El fix correcto es hacer EXPLÍCITA la instrucción de no commitear, tanto para workers como para el orquestador.
  2. "Unstaged" — los workers crean archivos nuevos (untracked) y modifican existentes (unstaged). Ambos son visibles con `git status`/`git diff`, que es lo que importa.

- **Riesgos y efectos secundarios** (arquitectura, performance, seguridad, mantenimiento):
  - **Bajo**: si un worker falla a mitad de un paso y hay cambios uncommitted de pasos anteriores, el workspace tiene cambios mezclados. Mitigación: cada paso se verifica antes de avanzar al siguiente, y el plan diseña pasos que tocan archivos distintos.
  - **Bajo**: la fase de "prueba local" alarga el ciclo. Mitigación: es tiempo del dev probando su feature — tiempo bien invertido que antes se gastaba en fix-de-fix post-PR.
  - **Nulo en código**: no se toca ningún `.js` — solo archivos `.md` de skills.

- **¿Qué pasa si NO se hace?** El flujo sigue saltando de verificación automática a PR. El dev descubre problemas después del commit/push, generando ruido en el historial y PRs con múltiples rondas de corrección.

- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?** No aplica: el cambio es puramente instruccional (documentación de skills). No hay lógica nueva que pueda fallar en runtime. El "fallo" sería que el agente ignore las instrucciones, que se detectaría en la primera tarea que use el flujo actualizado.

**Recomendación:** `proceder` — El cambio es de bajo riesgo (solo docs), alto valor (el dev prueba antes de commitear), y el alcance está bien acotado (4 archivos de skills).

## Preguntas de clarificación

_(las que hagan falta — SIN límite. Priorizadas: primero las que cambian el alcance o invalidan el enfoque. Hacerlas en tandas razonables, registrando la respuesta del dev al lado de cada una.)_

- [x] P1: ¿Qué tan guiado debería ser el test local? (A) Mínimo: "probá y avisame", (B) Guiado: sugiere cómo probar según tipo de cambio, (C) Asistido: ofrece ejecutar tests con el dev.
  - Respuesta: Opción B — guiado según tipo de cambio.
- [x] P2: ¿El commit lo hace el dev o el agente puede commitear después de la confirmación?
  - Respuesta: El agente NO commitea hasta que el dev pruebe. Así ve los diffs limpios. Después de confirmar, el agente puede commitear.

## Métrica de impacto

> Si el cambio admite una métrica cuantificable, definila. Si no aplica, declaralo explícitamente — no forzar una métrica artificial.

- **Métrica:** No aplica cuantitativamente. Es un cambio de flujo instruccional — el indicador es cualitativo: que la próxima tarea SDD ejecute la fase de prueba local antes de commitear.
- **Baseline actual:** Hoy el flujo va directo de "último paso verificado" a commit+push+PR sin pausa para test local.
- **Resultado esperado:** La próxima tarea SDD que ejecute el flujo completo debe pausar después de los pasos, guiar al dev a probar, y recién commitear tras confirmación.
- **Cómo se mide después:** Ejecutar una tarea SDD y verificar que el agente sigue el nuevo flujo.

---
_Aprobación del dev: pendiente_
