# ADR 0003 — `sdd publish` corre desde CI sobre main, no desde máquinas de dev

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

El grafo central (Fase 2) refleja un snapshot de arquitectura por repo (C1, endpoints expuestos, consumos detectados). Para que ese snapshot sea confiable, hay que decidir quién/cuándo lo publica: cada dev desde su máquina en cualquier momento, o un proceso automatizado en un punto fijo del ciclo de vida del código.

## Decisión

`sdd publish` está pensado para correr **en CI al mergear a main** (la spec de Fase 2 documenta el snippet de GitHub Actions). Cada publicación incluye **hash de commit y timestamp**, para que cualquier consumidor del grafo (`sdd impact`, `sdd context`) pueda detectar entradas viejas/stale.

## Alternativas consideradas

- **Publish manual desde la máquina del dev** (`sdd publish` corrido a mano): descartado como mecanismo principal — depende de disciplina humana, y publicaría estado de branches no mergeados, ensuciando el grafo compartido con código que podría no llegar a main.
- **Publish en cada push a cualquier branch:** descartado — generaría ruido (múltiples versiones del mismo repo en branches distintos) y el grafo de impacto debe reflejar lo que está/estará desplegado (main), no trabajo en progreso.

## Consecuencias

- Repos sin CI configurado para correr `sdd publish` quedan "sin publicar" — el grafo debe poder reportar esto explícitamente (y `sdd context` debe mostrarlo, según el objetivo de integración de Fase 2).
- El hash de commit + timestamp permite a futuro alertar ("este snapshot tiene 47 días, puede estar desactualizado") sin necesidad de re-publicar todo bajo demanda.
- Nada impide correr `sdd publish` manualmente para debugging/pruebas locales, pero no es el flujo soportado/documentado como oficial.
