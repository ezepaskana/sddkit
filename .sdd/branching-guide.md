# Guía: cómo crear el PR manualmente

`sdd task close <id>` intenta crear automáticamente un PR/MR en draft, detectando
la plataforma del remoto `origin` (GitHub, Azure DevOps o GitLab) y usando el CLI
nativo correspondiente (`gh`, `az`, `gl`). Esto es **best effort** (BR-041): si la
plataforma no se reconoce, o el CLI no está instalado/autenticado, sddkit **no
falla** — degrada e imprime en el reporte de cierre:

```
# PR: PR ready to create manually. Ir a: <URL>
```

o, si no se pudo derivar una URL (remoto desconocido / sin `origin`):

```
# PR: PR ready to create manually. Crear PR/MR para `<rama>` → `<destino>` en tu plataforma de git.
```

Esta guía explica cómo terminar el paso a mano en cada plataforma soportada.

> Antes de crear el PR, asegurate de que la rama esté pusheada:
> `git push origin <rama>` (si no, `sdd task close` te lo va a recordar).

---

## GitHub

**CLI nativo:** [`gh`](https://cli.github.com/) (`gh pr create --draft`).

Si `gh` no está instalado o no estás autenticado (`gh auth login`):

1. Abrí la URL que imprime sddkit: `https://github.com/<owner>/<repo>/pull/new/<rama>`
2. GitHub te muestra el formulario de PR con `<rama>` como `compare` y la rama de
   destino (`main`/`develop`, según tu `.sdd/branching.md`) como `base`.
3. Completá título y descripción (podés copiar el texto que generó sddkit en el
   reporte de cierre: título de la tarea + link a `.sdd/tasks/<dir>/`).
4. Marcá **"Create draft pull request"** si tu workflow usa drafts.

Equivalente por CLI, si instalás `gh` después:

```bash
gh pr create --draft \
  --title="<título>" \
  --body="<descripción>" \
  --head=<rama> \
  --base=<destino>
```

---

## Azure DevOps

**CLI nativo:** [`az`](https://learn.microsoft.com/cli/azure/) con la extensión
`azure-devops` (`az repos pr create --draft`).

Si `az` no está instalado o no tiene la extensión/login configurados:

1. Entrá al proyecto en Azure DevOps → **Repos → Pull requests → New pull
   request**.
2. Elegí como **source branch** `<rama>` y como **target branch** `<destino>`
   (`main`/`develop` según `.sdd/branching.md`).
3. Completá título y descripción con el texto generado por sddkit.
4. Marcá **"Draft"** antes de crear el PR si tu workflow lo requiere.

Equivalente por CLI, si configurás `az` después:

```bash
az repos pr create \
  --source-branch <rama> \
  --target-branch <destino> \
  --draft \
  --title "<título>" \
  --description "<descripción>"
```

---

## GitLab

**CLI nativo:** [`glab`](https://gitlab.com/gitlab-org/cli) (sddkit invoca el
binario como `gl`; en muchas instalaciones el comando real es `glab`, podés
crear un alias si querés que sddkit lo detecte: `alias gl=glab`).

Si no tenés el CLI instalado/autenticado:

1. Entrá al proyecto en GitLab → **Merge requests → New merge request**.
2. Elegí `<rama>` como **source branch** y `<destino>` (`main`/`develop`) como
   **target branch**.
3. Completá título y descripción con el texto generado por sddkit.
4. Marcá **"Mark as draft"** (o prefijá el título con `Draft:`) si tu workflow lo
   requiere.

Equivalente por CLI, si instalás `glab` (o el alias `gl`) después:

```bash
gl mr create \
  --source-branch <rama> \
  --target-branch <destino> \
  --draft \
  --title "<título>" \
  --description "<descripción>"
```

---

## Bitbucket

Bitbucket no está soportado en la detección automática de sddkit (Fase 1 cubre
GitHub, Azure DevOps y GitLab — ver spec de la tarea 010, "Fuera de alcance").
`sdd task close` para un remoto de Bitbucket siempre degrada a instrucciones
manuales sin URL derivada. Para crear el PR a mano:

1. Pusheá la rama si todavía no lo hiciste: `git push origin <rama>`.
2. Entrá al repositorio en Bitbucket → **Pull requests → Create pull request**.
3. Elegí `<rama>` como **source** y `<destino>` (`main`/`develop`) como
   **destination**.
4. Completá título y descripción con el texto generado por sddkit (título de la
   tarea + link a `.sdd/tasks/<dir>/`).
5. Si tu workflow usa PRs en draft, marcá la opción correspondiente (Bitbucket
   Cloud la llama simplemente "Create" sin estado draft nativo; Bitbucket Data
   Center sí soporta "Mark as draft" en algunas versiones).

Existe el CLI no oficial [`bb`](https://github.com/craicoverflow/bb-cli) si tu
equipo quiere automatizar esto a futuro, pero sddkit no lo invoca (fuera de
alcance Fase 1).

---

## Referencia rápida

| Plataforma   | CLI detectado | Comando que ejecuta sddkit (si está disponible) |
|--------------|----------------|---------------------------------------------------|
| GitHub       | `gh`           | `gh pr create --draft --title="..." --body="..." --head=<rama> --base=<destino>` |
| Azure DevOps | `az`           | `az repos pr create --source-branch <rama> --target-branch <destino> --draft --title "..." --description "..."` |
| GitLab       | `gl`           | `gl mr create --source-branch <rama> --target-branch <destino> --draft --title "..." --description "..."` |
| Bitbucket    | —              | No soportado — siempre manual (ver sección arriba) |
| Otro/`unknown` | —            | No soportado — siempre manual, sin URL derivada |
