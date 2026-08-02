# Ejemplo: brainstorm de diseño (standalone, read-only)

> `/sdd-analyze ¿cómo podríamos hacer que las skills se actualicen con sdd sync sin perder customizaciones del usuario?`

El análisis produce **dos salidas** (BR-064): la respuesta corta al dev y la nota extendida.

---

## 1. Al chat (lo único que ve el dev)

> El problema de fondo: `installSkills` (`src/lib/skills.js`) es un **mirror ciego** — borra el destino y copia, sin diff. El dev trata `.claude/skills/` como editable y sync lo trata como descartable.
>
> Tres formas de arreglarlo:
>
> 1. **Fusionar los dos textos**, como hace git al mergear
>    → conservás cualquier edición tuya, pero vas a resolver conflictos a mano
> 2. **Marcar zonas protegidas** dentro del archivo
>    → simple y sin sorpresas, pero solo podés editar donde upstream te dejó
> 3. **Un archivo aparte tuyo** que se suma al de sddkit ← la que recomiendo
>    → nunca perdés nada de ningún lado, y ya lo hacemos así con la config
>
> Antes de decidir necesito saber una cosa: ¿las skills las lee Claude Code directo de `.claude/skills/`, o las carga algo nuestro? Si es lo primero, la 3 no se puede y queda la 2.
>
> **¿Me lo confirmás y arranco con esa?** Detalle completo en `.sdd/notes/sync-skills-customizaciones.md`.

**131 palabras.** Hallazgo + 3 opciones **con lo que gana cada una** + la pregunta que destraba. Y ahí **frena**.

Fijate lo que NO aparece en el chat: `3-way merge`, `<!-- user:start/end -->`, `SKILL.local.md`, "base+overlay". Todo eso está en la nota. Al dev le llega lo que cada opción le da (BR-067).

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

## Anti-ejemplos

**Por volumen:** volcar las tres opciones **con sus pros y contras completos**, más la recomendación argumentada, más la pregunta: 300+ palabras que el dev no puede contestar de un saque.

**Por jerga:** _"Opción C (overlay `SKILL.local.md`) es la única compatible con BR-032 sin romper el mirror de `installSkills`."_ — 15 palabras, y el dev no entiende ninguna. Corto no es lo mismo que claro (BR-067).

**Por cierre:** terminar con una lista de cuatro tareas y ningún signo de pregunta. El dev no sabe si tiene que elegir, aprobar o solo leer (BR-068).
