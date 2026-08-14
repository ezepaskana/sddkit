# Ejemplo: retro de la tarea 005 (caché de sesión) — 140 palabras

```markdown
# Retro — tarea 005: caché de sesión en el cliente HTTP

## Métrica vs baseline

- **Baseline → resultado:** 5 llamadas al proveedor de identidad por request → 1 por sesión.
- **¿Se cumplió?:** Sí. Verificado en este repo y en 2 servicios piloto con tráfico real.

## Desvíos del plan

- Se agregó un paso 5 no previsto: la spec no consideró "mismo token, pero los claims mutaron" (el proveedor rota scopes sin cambiar el `exp`). Hubo que invalidar por hash de claims además de por vencimiento.
- El cliente no tenía forma de instrumentarse: hubo que exponer un contador de hits antes del paso 1 (~20 líneas).

## Aprendizajes accionables

- **LEARNINGS:** el cliente HTTP devuelve `{data, cacheHit}` — cualquier métrica de caché se construye desde ahí, no instrumentando de nuevo.
- **LEARNINGS:** "el token sigue vigente" no se decide solo por `exp`: chequear también si los claims cambiaron.
- **Tests:** usar un `exp` sentinela en el pasado, nunca uno calculado desde `now()`.
- **domain.md:** BR-030 a BR-034 ya escritas en la spec. **ADR:** `N/A: consistente con la capa de clientes existente.`
```

Cierre: se marca `done` en `.sdd/tasks/index.json`. Los artefactos quedan en `.sdd/tasks/005-…/` como registro auditable.
