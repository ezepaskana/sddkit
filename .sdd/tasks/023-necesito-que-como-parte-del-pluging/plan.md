# Plan — tarea 023: Necesito que como parte del pluging de sdd se agregue una sk…

> Tope: **45 líneas** (BR-082). Lista de pasos (BR-085). El dev debe APROBARLO antes de ejecutar.

- [x] **1. Rama de la tarea** — `git checkout -b task/023-skill-caveman` según `.sdd/branching.md`. `cmd: test "$(git branch --show-current)" = task/023-skill-caveman`
- [x] **2. Escribir `skills/caveman/SKILL.md`** — frontmatter `name: caveman` + description que dispare con "modo caveman"/"caveman"; cuerpo: reglas de compresión en español, qué NUNCA se comprime, frontera chat-vs-artefactos, cómo desactivar. Tope 45 líneas. `cmd: test -f skills/caveman/SKILL.md && test $(wc -l < skills/caveman/SKILL.md) -le 45 && grep -q '^name: caveman$' skills/caveman/SKILL.md`
- [x] **3. Escribir `hooks/caveman.md`** `[P]` — directiva corta: modo activo toda la sesión, leé la skill antes de la primera respuesta, se apaga con `ui.caveman: "no"`. Sin duplicar las reglas del paso 2. `cmd: test -f hooks/caveman.md && test $(wc -l < hooks/caveman.md) -le 15`
- [x] **4. Tercer hook `SessionStart` en `hooks/hooks.json`** — Depende de 3. On por default: solo calla si `.sdd/config.json` trae `"caveman": "no"`. `cmd: python3 -c "import json;h=json.load(open('hooks/hooks.json'))['hooks']['SessionStart'][0]['hooks'];assert len(h)==3 and 'caveman.md' in h[2]['command'] and 'CLAUDE_PLUGIN_ROOT' in h[2]['command']"`
- [x] **5. Verificar el hook con las dos configs** — Depende de 4. Correr el one-liner con `"caveman": "no"` presente (no emite) y ausente (emite). `Verificación manual del dev.`
- [x] **6. BR-091 en `.sdd/domain.md`** `[P]` — regla vinculante: caveman on por default vía hook, apagable con `ui.caveman`, aplica SOLO al chat con el dev, y las reglas de brevedad BR-064/066/067/068 siguen mandando por encima. `cmd: grep -q 'BR-091' .sdd/domain.md`
- [x] **7. Fila de `caveman` en `.sdd/c4/components.md`** — Depende de 2 y 3. Dos filas: la skill y el hook nuevo; actualizar el Mermaid del diagrama. Respetar el tope de 45 líneas del doc. `cmd: grep -q 'skills/caveman/SKILL.md' .sdd/c4/components.md && grep -q 'hooks/caveman.md' .sdd/c4/components.md && test $(wc -l < .sdd/c4/components.md) -le 45`
- [x] **8. Documentar `ui.caveman` en `.sdd/config.json`** `[P]` — extender el `_nota` de `ui` con el flag nuevo y sus valores. `cmd: grep -q 'caveman' .sdd/config.json`
- [x] **9. Validar el plugin** — Depende de 4. Copiar `plugin.json` solo a un dir temporal y correr `claude plugin validate` ahí (si valida el marketplace, no sirve). `cmd: d=$(mktemp -d) && mkdir -p $d/.claude-plugin && cp .claude-plugin/plugin.json $d/.claude-plugin/ && cp -r skills hooks $d/ && claude plugin validate $d`
- [x] **10. README y CHANGELOG** `[P]` — Depende de 2. Listar la skill nueva donde ya se listan las siete `sdd-*` y agregar la entrada de versión. `cmd: grep -qi caveman README.md && grep -qi caveman CHANGELOG.md`

Criterios de aceptación (van acá, no en spec — riesgo bajo, BR-058):

1. Sesión nueva en un repo con el plugin instalado y sin `ui.caveman` → el agente responde comprimido desde el primer turno.
2. `.sdd/config.json` con `"caveman": "no"` → el hook no emite nada y las respuestas son normales.
3. El dev dice "normal" / "basta caveman" → el agente vuelve a prosa en el acto, sin tocar archivos.
4. Ningún artefacto SDD, doc C4, commit ni cuerpo de PR sale comprimido, con caveman activo o no.

---
_Aprobación del dev: dada el 2026-08-16 ("Dale, arrancá")_
