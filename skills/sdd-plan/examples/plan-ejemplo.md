# Ejemplo de pasos bien descompuestos (≤ 3 sub-ítems cada uno)

- [ ] **2. Instrumentar latencia de GET /plants** `[P]` _(rapido)_
  - **Hace:** log de duración por request con percentiles: `src/middleware/timing.js`, `src/app.js`
  - **Verificación:** `cmd: node scripts/bench-plants.mjs` — imprime el P95 baseline

- [ ] **3. Tests de contrato de GET /plants con join** `[P]` _(rapido)_
  - **Hace:** caso feliz, lista vacía y planta sin medidor: `tests/plants.spec.js`
  - **Verificación:** `cmd: sdd test` — los 3 tests nuevos en rojo

- [ ] **4. Reemplazar el N+1 por JOIN en `plantService.list`** _(fuerte)_
  - **Hace:** una sola query con join a medidores, mismo contrato de respuesta: `src/services/plantService.js`
  - **Depende de:** paso 3
  - **Verificación:** `cmd: sdd test` — tests del paso 3 en verde

Anti-ejemplo (NO hacer): `- [ ] Implementar la mejora de performance del endpoint` — no es verificable, no dice archivos, mezcla diseño con ejecución. Tampoco: un paso con seis sub-ítems de prosa explicando el diseño (eso es la spec, no el plan).
