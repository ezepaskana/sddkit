# Ejemplo: retro de la tarea 005 (`sdd sync`) — 140 palabras

```markdown
# Retro — tarea 005: comando sdd sync

## Métrica vs baseline

- **Baseline → resultado:** 5 pasos manuales para actualizar sddkit en un repo existente → 1 (`sdd sync`).
- **¿Se cumplió?:** Sí. Verificado en este repo y en 2 pilotos con versiones viejas.

## Desvíos del plan

- Se agregó un paso 5 no previsto: la spec no consideró "misma versión, pero init igual mutó config" (BR-029 agrega campos sin bumpear `version`). Hubo que chequear `actions` además de `cfg.version`.
- `init()` no tenía supresión total de output: hubo que agregar `flags.silent` antes del paso 1 (~20 líneas).

## Aprendizajes accionables

- **LEARNINGS:** `init(root, flags)` devuelve `{actions, skipped}` y respeta `silent` — cualquier comando fino sobre init construye su resumen desde ahí.
- **LEARNINGS:** "está al día" no se decide solo por el campo `version`: chequear también si `actions` reportó cambios reales.
- **Tests:** usar `0.0.0` como versión vieja sentinela, nunca la real del package.json.
- **domain.md:** BR-030 a BR-034 ya escritas en la spec. **ADR:** `N/A: consistente con los comandos CLI existentes.`
```

Cierre: `sdd task status 005 done`. Los artefactos quedan en `.sdd/tasks/005-…/` como registro auditable.
