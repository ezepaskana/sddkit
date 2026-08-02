# Retro — tarea 011

**Métrica vs baseline:** CLAUDE.md 447 palabras vs AGENTS.md 936 (−52%, presupuesto ≤450 cumplido). Ejemplos de skills 1.034 → 380 líneas (−63%). Contrato de consola 31 → ≤12 líneas. Artefactos por tarea (−50% esperado): se mide en la primera tarea que use los templates nuevos.

**Desvíos:** el renumerado de `sdd task plan` desfasó los "Depende de" (corregido a mano); verificaciones `grep "not ok"` requieren `--test-reporter=tap` en Node 24; la verificación del paso 14 estaba invertida (`!` de más); falsos positivos cjs por `createRequire` obligaron a ajustar el detector; `e2e.test.js` y baseline de catálogo asumían el flujo viejo.

**Aprendizajes:** los ejemplos de las skills fijan el estándar que el agente copia; presupuestos + gates con N/A bajan la verborragia sin perder trazabilidad. Cosechados a LEARNINGS.md.
