# Analysis — tarea 024: Dale con la 1, redactá bootstrap.md en serio

## Entendimiento

`hooks/bootstrap.md` es un placeholder. Su primer bloque dice literalmente **"⚠️ PLACEHOLDER — redactar en una tarea posterior. Lo que falta es el texto real de las instrucciones"**, y el resto son dos párrafos genéricos más el ofrecimiento de termaid.

El hook funciona: en el repo `tinku` disparó en 2 de 3 sesiones (`hook_success SessionStart:startup`) y el archivo llegó al contexto del agente. Lo que falló es el contenido — el agente lo leyó como instrucciones incompletas, construyó la app entera y recién al final de una respuesta larga mencionó "este repo no tiene `.sdd/config.json`, si querés lo configuro". El dev nunca vio una pregunta. (En la 3ra sesión el plugin se instaló a mitad de sesión: ahí es correcto que no dispare.)

Hay que escribir el contenido real: **qué investiga** el agente, **qué le pregunta** al dev, **qué escribe** en `.sdd/` y **cuándo** lo hace — antes de atender el pedido, no después. El procedimiento existía en la skill `sdd-bootstrap` (`SKILL.md` + `references/completar-docs.md`), borrada en la tarea 020 junto con el CLI; su lógica sigue siendo válida salvo los comandos `sdd …` que ya no existen.

## Huecos

- [x] **H1:** ¿`bootstrap.md` corto que invoca una skill `sdd-bootstrap` re-creada, o todo el procedimiento adentro del archivo? — _sugerido:_ hook corto + skill. El hook entra al contexto de **toda** sesión sin configurar; el procedimiento completo (config, C4, catálogo, rules de capa, `CLAUDE.md` de módulo) no puede pesar ahí. Implica reescribir BR-080 y revertir parte de la spec de la tarea 020.
  - Respuesta: aprobado — `bootstrap.md` corto (ofrecimiento + invocación); el procedimiento va en la skill `sdd-bootstrap` re-creada. BR-080 se reescribe.
- [x] **H2:** ¿El agente pregunta **antes** de atender el pedido del dev? — _sugerido:_ sí, una línea como primer acto del turno ("este repo no tiene sddkit configurado, ¿lo configuro antes de arrancar?"). Es exactamente lo que faltó en tinku.
  - Respuesta: aprobado — el ofrecimiento es el primer acto del turno, antes de atender el pedido.
- [x] **H3:** Repo vacío o desde cero (el caso `tinku`): no hay código que investigar. — _sugerido:_ escribir `.sdd/` mínimo con lo que el dev diga que va a construir y completar C4 y catálogo al cerrar la primera tarea, en vez de investigar la nada.
  - Respuesta: aprobado — repo vacío: `.sdd/` mínimo con lo declarado por el dev; C4 y catálogo se completan al cerrar la primera tarea.
- [x] **H4:** ¿Qué escribe el bootstrap, exactamente? — _sugerido:_ `config.json`, bloque gestionado de `CLAUDE.md`, los 3 niveles de `.sdd/c4/`, `domain.md`, `QUESTIONS.md`, `catalog.json` + `patterns.json` y `branching.md`. Las rules de capa (BR-071) y los `CLAUDE.md` de módulo (BR-073) **solo si** detecta capas o 2+ módulos.
  - Respuesta: aprobado — ese es el alcance; rules de capa y `CLAUDE.md` de módulo solo si hay capas o 2+ módulos.
- [x] **H5:** Si el dev dice que no, ¿cómo se evita re-preguntar cada sesión? Sin `.sdd/` no hay dónde persistirlo. — _sugerido:_ no se persiste: se respeta el "no" en esa sesión y se vuelve a ofrecer en la próxima, en una línea. Escribir un `config.json` "rechazado" haría que el repo cuente como configurado.
  - Respuesta: aprobado — el 'no' no se persiste: vale por la sesión y se re-ofrece en la siguiente, en una línea.

---
_Aprobación del dev: aprobado 2026-08-17 (las 5 sugerencias)_
