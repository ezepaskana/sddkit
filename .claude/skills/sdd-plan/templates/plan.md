# Plan — tarea __ID__: __TITLE__

> Pasos CHICOS: cada uno verificable por sí solo y completable en una sesión corta. Los tests van ANTES que la implementación que cubren. **Máximo 3 sub-ítems por paso** — sin prosa extra. `N/A: <motivo>` es válido donde no aplique. El dev debe APROBAR este plan antes de ejecutar.

Estructura de cada paso — el checkbox de la **primera línea** es lo que `sdd task` trackea; el detalle va en sub-ítems indentados:

```markdown
- [ ] **N. Título corto del paso** `[P]` _(rapido)_
  - **Hace:** qué se construye o cambia, con los archivos al final: `ruta/uno`, `ruta/dos`
  - **Depende de:** paso M _(omitir la línea entera si no depende de nadie)_
  - **Verificación:** `cmd: <comando>` — preferido; texto plano solo si no hay comando posible
```

`[P]` = paralelizable · Nivel de modelo por paso: _(rapido)_ mecánico/boilerplate · _(medio)_ implementación estándar · _(fuerte)_ diseño, lógica compleja, edge cases. Los modelos concretos de cada nivel están en `.sdd/config.json → models`.

> La sección de **rama de trabajo** y el Paso 1 (`git checkout -b <rama>`) los genera automáticamente `sdd task plan` desde `.sdd/branching.md`; los pasos que escribas acá se renumeran a partir del Paso 2.

## Diagrama de dependencias (opcional)

> Incluilo SOLO si REEMPLAZA prosa: 3+ pasos con dependencias cruzadas o paralelismo no obvio. Si el orden es lineal, **borrá esta sección**.
>
> Si lo incluís: bloque ` ```mermaid ` con `flowchart LR` en la primera línea — `sdd validate` falla si no declara un tipo válido.

## Pasos

- [ ] **1. …** _(fuerte)_
  - **Hace:** … `ruta/al/archivo`
  - **Verificación:** `cmd: …`

---

_Aprobación del dev: pendiente_
