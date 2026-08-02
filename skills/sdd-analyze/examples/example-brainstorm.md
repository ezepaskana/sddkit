# Ejemplo: brainstorm de diseño (standalone, read-only)

> `/sdd-analyze ¿cómo podríamos hacer que las skills se actualicen con sdd sync sin perder customizaciones del usuario?`

El análisis produce **dos salidas** (BR-064): la respuesta corta al dev y la nota extendida.

---

## 1. Al chat (lo único que ve el dev)

> El problema de fondo: `installSkills` (`src/lib/skills.js`) es un **mirror ciego** — borra el destino y copia, sin diff. El dev trata `.claude/skills/` como editable y sync lo trata como descartable.
>
> Tres formas de arreglarlo:
>
> 1. **3-way merge** — preserva ediciones arbitrarias, pero hay que guardar la versión base y los conflictos en Markdown son ruidosos.
> 2. **Bloques protegidos** `<!-- user:start/end -->` — simple y sin estado extra, pero solo customizás donde upstream marcó.
> 3. **Overlay `SKILL.local.md`** ← recomendada. Única con garantía en ambos sentidos, y el repo ya usa base+overlay en `settings.json`.
>
> Antes de decidir necesito saber una cosa: ¿las skills las lee Claude Code directo de `.claude/skills/`, o hay loader nuestro? Si es lo primero, la 3 no es implementable y queda la 2.
>
> Detalle completo en `.sdd/notes/sync-skills-customizaciones.md`.

**112 palabras.** Hallazgo + 3 opciones + la pregunta que destraba. Y ahí **frena**.

---

## 2. A la nota (`.sdd/notes/sync-skills-customizaciones.md`)

```markdown
# Sync de skills sin perder customizaciones

**Estado:** en curso · **Última sesión:** 2026-08-02

## Conclusión hasta ahora
`installSkills` (`src/lib/skills.js`) borra y copia sin diff ni detección de ediciones
locales (BR-032 lo define como mirror real, no merge). LEARNINGS ya registra el drift.
Hoy la única protección es no correr sync, lo que anula el valor del comando.

## Decisiones del dev
- (pendiente) elegir entre merge / bloques protegidos / overlay

## Detalle
### A. 3-way merge (base/upstream/local)
- Pros: preserva ediciones arbitrarias; modelo mental de git.
- Contras: guardar la versión base = estado extra; conflictos a mano, ruidosos en prosa.

### B. Bloques protegidos `<!-- user:start/end -->`
- Pros: simple, sin estado extra, el dev ve qué se preserva.
- Contras: solo customizás donde upstream marcó; si upstream reestructura, marcadores huérfanos.

### C. Overlay `SKILL.local.md` (upstream inmutable) ← recomendada
- Pros: garantía en ambos sentidos; cero conflictos; precedente en `settings.json`/`settings.local.json`.
- Contras: el overlay agrega, no edita en el lugar; requiere que el loader lo entienda.
- El costo real está en el loader, no en sync.

## Abierto
- [ ] ¿Claude Code lee `.claude/skills/` directo o hay loader nuestro? Si es directo, C cae y queda B.
- [ ] ¿Qué pasa con BR-032 (mirror real) si adoptamos overlay? Puede necesitar ADR.
```

---

## Anti-ejemplo

Volcar las tres opciones **con sus pros y contras completos** en el chat, más la recomendación argumentada, más la pregunta: 300+ palabras que el dev no puede contestar de un saque. Eso va a la nota. Al chat va el titular y el menú.
