---
name: sdd-close
description: Fase de cierre de una tarea SDD. Usar al completar todos los pasos del plan para hacer la retro, medir la métrica y cosechar aprendizajes al framework.
---

# sdd-close — cierre con retro (alimenta el aprendizaje — no es opcional)

`sdd task status <id> done` exige una retro completa (`retro.md`; el comando crea la plantilla — formato canónico en `templates/retro.md`).

## Retro completa (`retro.md`)

1. **Métrica**: medí el "después" y compará contra el baseline de analysis.md. Si no se cumplió lo esperado, decilo — un resultado negativo también es aprendizaje.
2. **Desvíos**: qué anticipó mal la spec, qué pasos se replanificaron y por qué.
3. **Cosecha**: los aprendizajes que apliquen a futuras tareas van a `.sdd/LEARNINGS.md` — reglas de curado en `references/curado.md`.
4. **Promoción** (cada conocimiento a su destino):
   - Convención nueva → `sdd decide`
   - Regla de negocio nueva/cambiada → `.sdd/domain.md` (numerada BR-NNN)
   - Decisión de arquitectura → ADR en `.sdd/decisions/`
   - Cambio estructural → `.sdd/c4/`
   - Pregunta de clarificación que ya apareció en otra tarea → respondela permanentemente en los docs
5. Verificá que el pre-commit pase.

## Commit de cierre

Una vez completada la retro, commitea `retro.md` junto con los archivos de promoción que hayas tocado (`.sdd/LEARNINGS.md`, `.sdd/domain.md`, `.sdd/c4/`, `.sdd/decisions/`, o lo que correspondiera):

```bash
git add retro.md .sdd/LEARNINGS.md [otros archivos de promoción]
git commit -m "[tarea <id>] Cierre: retro + aprendizajes"
```

Esto cierra el trabajo local antes del push. Los archivos de promoción quedan en la rama de la tarea.

## Push y Pull Request

Los cambios commiteados (incluyendo la retro) están listos para pushear. Ahora `sdd task close <id>` ejecuta automáticamente:

1. **Pushea la rama** — si no está pusheada en `origin`, corre `git push -u origin <rama>`.
2. **Detecta plataforma git** — GitHub, Azure DevOps, GitLab (u otra).
3. **Construye PR** — automáticamente crea un PR en draft con:
   - Título: `[tarea <id>] <título>`
   - Body: resumen de cambios + link a la tarea + checklist de validación
   - Rama: la rama de la tarea
   - Base: `main` (o `develop` si usas Git Flow)
4. **Crea PR o instrucciones manuales**:
   - Si `gh` (GitHub CLI) está disponible → `gh pr create --draft ...`
   - Si `az` (Azure CLI) está disponible → `az repos pr create ...`
   - Si `gl` (GitLab CLI) está disponible → `gl mr create ...`
   - Si **NO** hay tool disponible → imprime instrucciones copy-paste para crear manual

**Próximo paso:** Cerrá la tarea con `sdd task status <id> done`.

## Additional Resources

- `examples/retro-ejemplo.md` — Ejemplo de retro completa con datos reales (tarea sdd sync).
- `references/curado.md` — Reglas de curado para LEARNINGS.md (accionable, fusionar, podar, tope ~30).
- `templates/retro.md` — Template canónico de retro.md.
