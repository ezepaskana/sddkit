# Ejemplo: flujo completo de una tarea `feature`

Mensaje del dev: _"quiero que sdd doctor muestre el estado de los hooks post-commit"_ → "quiero que" es keyword de cambio → se dispara `/sdd-task`.

## 1-2. Capturar y clasificar

```bash
sdd task new "quiero que sdd doctor muestre el estado de los hooks post-commit"   # → 004, requirement.md
sdd task type 004 feature      # crea analysis.md, spec.md y plan.md
```

Anuncio: _"Lo trato como `feature` (riesgo bajo): comportamiento nuevo en el reporte, pero el patrón de pre-commit ya existe. Decime si preferís otro tipo."_

## 3. Analizar (`/sdd-analyze`) — ≤ 350 palabras

- **¿Ya existe?** `checkHooks()` en `src/commands/doctor.js` cubre pre-commit, no post-commit.
- **Alternativa más simple:** parametrizar el check existente en vez de duplicarlo.
- **Riesgos:** ninguno — es lectura de filesystem. **Métrica:** doctor reporta 0 → 1 tipo de hook post-commit.
- **Recomendación:** `proceder con cambios` (parametrizar, no duplicar).

`sdd task status 004 analyzed` → el dev aprueba.

## 4. Especificar (`/sdd-specify`) — ≤ 300 palabras

- CUANDO se corre `sdd doctor`, EL SISTEMA DEBE incluir el estado del hook post-commit.
- SI no existe el hook post-commit, EL SISTEMA DEBE reportar "missing" sin error (BR-027).

`sdd task status 004 specified` → el dev aprueba.

## 5. Planificar (`/sdd-plan`) — ≤ 3 sub-ítems por paso

Paso 2 test de `checkHook('post-commit')` _(rapido)_ · Paso 3 parametrizar `checkHooks()` _(medio)_ · Paso 4 actualizar `.sdd/c4/components.md` _(rapido)_. El Paso 1 (rama) lo genera `sdd task plan`.

`sdd task status 004 planned` → el dev aprueba → `in-progress`.

## 6. Ejecutar y cerrar

`/sdd-execute`: un subagente por paso con `sdd task brief 004 <n>`, verificación con `sdd task verify` antes de marcar cada checkbox. `/sdd-close`: retro ≤ 150 palabras (métrica cumplida, sin desvíos, un aprendizaje cosechado) y `sdd task status 004 done`.
