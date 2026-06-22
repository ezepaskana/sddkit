# Ejemplo: Auditoría de sdd-execute

Escenario: el usuario pide `/sdd-improve-skill sdd-execute`.

---

## Step 1-3: Identificar, leer y evaluar

Archivos leídos:
- `skills/sdd-execute/SKILL.md` (397 words)
- `skills/sdd-execute/examples/ejecucion-ejemplo.md`
- `skills/sdd-execute/references/protocolo-subagentes.md`

---

## Step 4-5: Evaluación y reporte

## Evaluación: sdd-execute

| Categoría                    | Estado  | Hallazgo                                           |
|------------------------------|---------|---------------------------------------------------|
| Trigger Description          | PASS    | 161 chars, clara                                   |
| Progressive Disclosure       | PASS    | 397 words, protocolo en references/                |
| Completitud de directorio    | PASS    | SKILL.md + example + references                    |
| Calidad de contenido         | IMPROVE | Punto 5 dice "registrá en spec.md" → debe ser analysis.md |
| Ejemplos y recursos          | IMPROVE | Ejemplo dice "registra en spec.md" → misma inconsistencia |
| Robustez                     | PASS    | Paso 1 bloqueante, verificación por orquestador    |

### Mejoras recomendadas

1. [Alto] En SKILL.md punto 5: "spec.md" → "analysis.md"
2. [Alto] En ejemplo: "registra la respuesta en spec.md" → "analysis.md"
3. [Bajo] Agregar sección Additional Resources

Pregunta al usuario: **¿Qué mejoras querés que aplique?**

→ Usuario: "Todas"

---

## Step 6: Aplicar mejoras

### Mejora 1 — SKILL.md

```diff
- resolvela con el dev, registrá la respuesta en spec.md, relanzá.
+ resolvela con el dev, registrá la respuesta en analysis.md, relanzá.
```

### Mejora 2 — Ejemplo

```diff
- El orquestador registra la respuesta en spec.md:
+ El orquestador registra la respuesta en analysis.md:
```

### Mejora 3 — Additional Resources

Agregada sección al final del SKILL.md apuntando a example y references.

---

## Step 7: Verificar

- ✓ `grep -q "analysis.md" skills/sdd-execute/SKILL.md`
- ✓ `grep -q "analysis.md" skills/sdd-execute/examples/ejecucion-ejemplo.md`
- ✓ `grep -q "Additional Resources" skills/sdd-execute/SKILL.md`
- ✓ Todas las referencias apuntan a archivos existentes
- ✓ Word count: 397 → 428 words (bajo ~1800)

---

## Step 8: Resultado

| Archivo | Acción |
|---|---|
| `skills/sdd-execute/SKILL.md` | 2 refs "spec.md" → "analysis.md". Additional Resources agregado |
| `skills/sdd-execute/examples/ejecucion-ejemplo.md` | 1 ref "spec.md" → "analysis.md" |
| `.claude/skills/sdd-execute/` | Sincronizado |

Word count: 397 → 428 words. Todas las categorías en PASS.
