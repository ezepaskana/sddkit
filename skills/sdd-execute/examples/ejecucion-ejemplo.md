# Ejemplo: ejecución orquestador/workers

Tarea 003 (`feature`, riesgo bajo): validar el archivo de configuración al arrancar la app. Plan de 4 pasos aprobado; el Paso 1 (rama) ya corrió y validó.

## Paso 2 — tests de la validación _(rapido)_

El orquestador arma el brief del paso (el paso literal del plan + el objetivo + los dos criterios EARS que ese paso cubre + BR-012 transcrita + las reglas de conducta) y lo pasa como prompt:

```
Agent({ description: "Paso 2: tests de validación de config", model: "haiku", prompt: "<el brief>" })
```

El worker reporta "3 tests escritos". El orquestador **no confía en el reporte**: corre el `cmd:` del paso → 3 tests en rojo (esperado: la validación no existe todavía) → exit 0 → marca `- [x] **2. Tests de la validación** _(rapido)_`.

## Paso 3 — implementar _(fuerte)_ — worker bloqueado

El worker devuelve una pregunta en vez de código:

> "La spec dice 'campos obligatorios' pero no lista cuáles. ¿Solo `apiUrl`, o también `timeout` y `retries`?"

El orquestador **no decide solo**, se la pasa al dev. Dev: _"apiUrl y timeout. retries tiene default, no es obligatorio."_ Lo registra en `analysis.md`:

```
## Clarificación paso 3 (2026-06-22)
P: ¿Qué campos son obligatorios en la config? — R: apiUrl y timeout; retries tiene default.
```

Relanza con el brief actualizado (ya incluye la clarificación) → corre el `cmd:` → los tests del paso 2 en verde → checkbox.

## Paso 4 — docs _(rapido)_

`cmd: grep -q "validación de config" .sdd/c4/components.md` → exit 0 → checkbox.

## Prueba local y cierre

> **Orquestador → Dev:** Todos los pasos verificados. Probá: arrancá la app con `timeout` borrado del config — debe fallar con un mensaje que nombre el campo faltante.

Dev: _"Funciona, el mensaje es claro. Dale."_ → commit convencional (`feat(config): validar campos obligatorios al arrancar`) → **sdd-close**.
