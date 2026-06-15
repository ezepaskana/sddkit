# Política de seguridad

## Cómo reportar una vulnerabilidad

Si encontrás un problema de seguridad en sddkit, **no abras un issue público**. Reportalo por correo a **eze.paskana@gmail.com** para coordinar una divulgación privada.

Se agradece incluir:

- Una descripción del problema.
- Pasos para reproducirlo.
- El impacto potencial (qué podría hacer un atacante explotándolo).

## Divulgación responsable

Este es un proyecto mantenido por una sola persona, en modo *best-effort* — no hay SLAs corporativos, pero el compromiso es:

- Acusar recibo del reporte en un plazo razonable (algunos días hábiles).
- Investigar y, si corresponde, preparar un fix.
- Coordinar con quien reporta la fecha de divulgación pública, dando preferencia a publicarla recién después de que el fix esté disponible.

## Alcance

sddkit es una herramienta de línea de comandos que **ejecuta comandos locales por diseño**: los `cmd:` de `.sdd/tasks/<id>/plan.md` (vía `sdd task verify`/`execute`), comandos de `git` y herramientas de PR como `gh`, `az` o `glab`. Este es el modelo de confianza documentado en el [README](README.md#seguridad), equivalente al de `make` o los `scripts` de `npm`.

**NO se consideran vulnerabilidades:**

- Que correr sddkit sobre un repo malicioso ejecute los comandos definidos en ese repo (`cmd:` de `plan.md`, `git checkout`, etc.). Es el comportamiento esperado y documentado.

**SÍ son de interés:**

- Inyección de comandos a partir de input que el usuario no esperaría que fuera ejecutable (por ejemplo, datos de un archivo de configuración tratados como código sin que esté documentado).
- Lectura o escritura fuera de los paths previstos (`.sdd/`, el repo del usuario, `~/.sddkit/`, etc.).
- Fuga de credenciales o secretos (por ejemplo, exponer `SDDKIT_GRAPH_DB_URL` en logs o en archivos versionados).
- Cualquier otro comportamiento que rompa los límites de confianza documentados arriba.

## Versiones soportadas

sddkit es un proyecto joven. Se da soporte de seguridad únicamente a la **última versión publicada** en npm (ver `version` en [`package.json`](package.json)). Se recomienda mantenerse actualizado con `sdd sync` tras cada `npm update`.
