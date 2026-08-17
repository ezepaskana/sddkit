# Ejemplo: brainstorm de diseño (standalone, read-only)

> `/sdd-analyze ¿cómo podríamos actualizar los templates de mail sin perder las personalizaciones que hizo cada cliente?`

El análisis produce **dos salidas** (BR-064): la respuesta corta al dev y la nota extendida.

---

## 1. Al chat (lo único que ve el dev)

> El problema de fondo: `syncTemplates` (`src/emails/sync.js:31`) es un **mirror ciego** — borra el destino y copia, sin diff. El cliente trata sus templates como editables y el sync los trata como descartables.
>
> Tres formas de arreglarlo:
>
> 1. **Fusionar los dos textos**, como hace git al mergear
>    → conservás cualquier edición del cliente, pero alguien resuelve conflictos a mano
> 2. **Marcar zonas protegidas** dentro del template
>    → simple y sin sorpresas, pero el cliente solo edita donde vos lo dejaste
> 3. **Un archivo aparte del cliente** que se suma al nuestro ← la que recomiendo
>    → nunca se pierde nada de ningún lado, y ya lo hacemos así con la config
>
> Antes de decidir necesito saber una cosa: ¿el motor de mails renderiza un solo archivo por template, o puede componer varios? Si es lo primero, la 3 no se puede y queda la 2.
>
> **¿Me lo confirmás y arranco con esa?** Detalle completo en `.sdd/notes/templates-mail-personalizaciones.md`.

**135 palabras.** Hallazgo + 3 opciones **con lo que gana cada una** + la pregunta que destraba. Y ahí **frena**.

Fijate lo que NO aparece en el chat: `3-way merge`, `<!-- user:start/end -->`, `welcome.local.hbs`, "base+overlay". Todo eso está en la nota. Al dev le llega lo que cada opción le da (BR-067).

---

## 2. A la nota (`.sdd/notes/templates-mail-personalizaciones.md`)

```markdown
# Actualizar templates de mail sin pisar personalizaciones

**Estado:** en curso · **Última sesión:** 2026-08-02

## Conclusión hasta ahora
`syncTemplates` (`src/emails/sync.js:31`) borra y copia sin diff ni detección de
ediciones locales (BR-032 lo define como mirror real, no merge). LEARNINGS ya
registra el drift. Hoy la única protección es no correr el sync, lo que anula
el valor de la actualización.

## Decisiones del dev
- (pendiente) elegir entre merge / bloques protegidos / overlay

## Detalle
### A. 3-way merge (base/upstream/local)
- Pros: preserva ediciones arbitrarias; modelo mental de git.
- Contras: guardar la versión base = estado extra; conflictos a mano, ruidosos en prosa.

### B. Bloques protegidos `<!-- user:start/end -->`
- Pros: simple, sin estado extra, el cliente ve qué se preserva.
- Contras: solo se customiza donde marcamos; si reestructuramos, quedan marcadores huérfanos.

### C. Overlay `welcome.local.hbs` (base inmutable) ← recomendada
- Pros: garantía en ambos sentidos; cero conflictos; precedente en `config/*.local.json`.
- Contras: el overlay agrega, no edita en el lugar; requiere que el renderer lo entienda.
- El costo real está en el renderer, no en el sync.

## Abierto
- [ ] ¿El renderer compone varios archivos por template? Si no, C cae y queda B.
- [ ] ¿Qué pasa con BR-032 (mirror real) si adoptamos overlay? Puede necesitar ADR.
```

---

## Anti-ejemplos

**Por volumen:** volcar las tres opciones **con sus pros y contras completos**, más la recomendación argumentada, más la pregunta: 300+ palabras que el dev no puede contestar de un saque.

**Por jerga:** _"Opción C (overlay `welcome.local.hbs`) es la única compatible con BR-032 sin romper el mirror de `syncTemplates`."_ — 15 palabras, y el dev no entiende ninguna. Corto no es lo mismo que claro (BR-067).

**Por cierre:** terminar con una lista de cuatro tareas y ningún signo de pregunta. El dev no sabe si tiene que elegir, aprobar o solo leer (BR-068).
