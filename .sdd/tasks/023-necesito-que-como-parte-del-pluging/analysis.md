# Analysis — tarea 023: Necesito que como parte del pluging de sdd se agregue una sk…

## Entendimiento

Agregar al plugin una skill que hace que el agente responda en estilo "caveman": español comprimido —sin artículos, sin conectores, sin cortesías, fragmentos en vez de oraciones— manteniendo intacta la sustancia técnica (números, negaciones, nombres exactos, rutas).

Es una skill **de estilo**, transversal, no una fase del flujo SDD. Se monta encima de las reglas de brevedad que ya existen (BR-064/066/067/068): esas siguen mandando —≤150 palabras, opciones numeradas, pregunta de cierre—; caveman solo cambia cómo se redacta cada línea.

Frontera dura heredada del original: caveman aplica **solo a lo que el agente le dice al dev en el chat**. Artefactos SDD (`requirement.md`, `analysis.md`, `plan.md`), documentos C4, mensajes de commit, títulos y cuerpos de PR, y cualquier texto destinado a un tercero se escriben en prosa normal.

## Huecos

- [x] **H1:** ¿Idioma de la compresión: español, inglés (port fiel) o ambos? — _sugerido:_ español, coherente con el plugin.
  - Respuesta: **español**.
- [x] **H2:** ¿Cuántos niveles de intensidad (el original tiene 6, incluyendo 3 de chino clásico)? — _sugerido:_ lite/full/ultra, sin wenyan.
  - Respuesta: **uno solo, sin niveles: on/off**.
- [x] **H3:** ¿Cómo se activa? — _sugerido:_ solo explícito (`/sddkit:caveman`).
  - Respuesta: **siempre activo, on por default**; la desactivación es explícita. Una skill no se carga sola: hace falta un tercer hook `SessionStart` que inyecte la instrucción en cada sesión, apagable con `.sdd/config.json → ui.caveman: "no"`. Queda advertido que esto le impone el estilo a cualquiera que instale el plugin (BR-079).
- [x] **H4:** ¿Persiste entre turnos? — _sugerido:_ sí, hasta "normal" / "basta caveman".
  - Respuesta: **ok**. Persistencia por instrucción, no por runtime (ADR-0016).
- [x] **H5:** ¿`caveman` o `sdd-caveman`? — _sugerido:_ `caveman`, porque no es una fase del flujo.
  - Respuesta: **ok**. Requiere fila nueva en `.sdd/c4/components.md`.

---
_Aprobación del dev: dada el 2026-08-16_
