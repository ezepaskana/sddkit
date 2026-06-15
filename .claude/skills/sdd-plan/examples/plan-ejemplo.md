# Ejemplo de pasos bien descompuestos

- [ ] **1. Instrumentar latencia de GET /plants** _(rapido)_
  - **Hace:** log de duración por request con percentiles en el endpoint actual
  - **Archivos:** `src/middleware/timing.js`, `src/app.js`
  - **Depende de:** —
  - **Verificación:** el log muestra P95 tras 20 requests (baseline registrado en spec.md)

- [ ] **2. Test de contrato GET /plants con join** _(rapido)_
  - **Hace:** tests del caso feliz, lista vacía y planta sin medidor
  - **Archivos:** `tests/plants.spec.js`
  - **Depende de:** —
  - **Verificación:** tests escritos y en rojo

- [ ] **3. Reemplazar N+1 por JOIN en plantService.list** _(fuerte)_
  - **Hace:** una sola query con join a medidores; mantiene el contrato actual
  - **Archivos:** `src/services/plantService.js`
  - **Depende de:** paso 2
  - **Verificación:** tests del paso 2 en verde; queries por request = 1 (log del paso 1)

Anti-ejemplo (NO hacer): "- [ ] Implementar la mejora de performance del endpoint" — no es verificable, no dice archivos, mezcla diseño con ejecución.
