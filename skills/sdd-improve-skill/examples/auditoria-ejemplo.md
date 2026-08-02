# Ejemplo: auditoría de `sdd-execute`

El dev pide `/sdd-improve-skill sdd-execute`.

## Steps 1-3 — leer

`skills/sdd-execute/SKILL.md` (397 words), su ejemplo y `references/protocolo-subagentes.md`.

## Steps 4-5 — evaluación y reporte

| Categoría | Estado | Hallazgo |
|---|---|---|
| Trigger description | PASS | 161 chars, clara |
| Progressive disclosure | PASS | 397 words, protocolo en `references/` |
| Completitud del directorio | PASS | SKILL.md + example + references |
| Calidad de contenido | IMPROVE | Punto 5: "registrá en spec.md" → debe ser analysis.md |
| Ejemplos | IMPROVE | Misma inconsistencia; además 142 líneas (límite: 40) |
| Robustez | PASS | Paso 1 bloqueante, verificación por el orquestador |

**Mejoras propuestas:** [Alto] corregir las 2 referencias a `spec.md`; [Alto] recortar el ejemplo a ≤ 40 líneas; [Bajo] agregar Additional Resources. → Dev: _"todas"_.

## Step 6 — aplicar

```diff
- resolvela con el dev, registrá la respuesta en spec.md, relanzá.
+ resolvela con el dev, registrá la respuesta en analysis.md, relanzá.
```

Ejemplo recortado a 38 líneas conservando el bloqueo y el reintento (lo que enseña el caso).

## Steps 7-8 — verificar y resumir

- ✓ `grep -q "analysis.md" skills/sdd-execute/SKILL.md` y en el ejemplo
- ✓ `wc -l` del ejemplo: 142 → 38
- ✓ Todas las referencias apuntan a archivos existentes · word count 397 → 428 (bajo ~1800)

Archivos tocados: `SKILL.md`, `examples/ejecucion-ejemplo.md`, y `.claude/skills/sdd-execute/` sincronizado.
