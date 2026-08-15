# Spec — tarea 022: el C4 denso y cargado bajo demanda

> Continúa `analysis.md`. Tope: 45 líneas (BR-082).

**Historia:** Como agente que trabaja en un repo ajeno quiero que la documentación de arquitectura esté escrita para mí y se cargue solo la parte que toco, para no gastar contexto en prosa de módulos que no voy a tocar.

## Criterios de aceptación

**Formato máquina**

- **CA-1** — `components.md` DEBE describir cada módulo con **rutas reales y símbolos reales** (archivos, clases, funciones de entrada), en tablas, no en prosa.
- **CA-2** — EL SISTEMA NO DEBE escribir en `components.md` nada que el agente pueda deducir leyendo un archivo que ya tiene abierto: el doc ubica y conecta, no explica el código.

**Índice y detalle**

- **CA-3** — CUANDO el repo tiene 2+ módulos, `components.md` DEBE ser un **índice**: una fila por módulo con su ruta, su responsabilidad en una línea y sus dependencias; el detalle va al `CLAUDE.md` de cada módulo (BR-073).
- **CA-4** — CUANDO el repo tiene un solo módulo, el detalle DEBE quedarse en `components.md` y NO se genera ningún `CLAUDE.md` anidado (H3).
- **CA-5** — El `CLAUDE.md` de un módulo DEBE listar los símbolos de entrada del módulo (qué expone y a quién), para que el agente sepa qué toca sin abrir todo el paquete.

**Frontera capa / módulo**

- **CA-6** — La **capa** (`.claude/rules/sdd-layer-<capa>.md`) describe CÓMO se escribe el código; el **módulo** (`<módulo>/CLAUDE.md`) describe QUÉ hace y de quién depende. Ninguno de los dos DEBE repetir lo del otro.
- **CA-7** — SI una convención aplica a una sola capa, DEBE ir en la rule de esa capa y NO en el `CLAUDE.md` del módulo ni en el bloque de la raíz (extiende BR-077).

**Niveles 1 y 2**

- **CA-8** — `sdd-analyze` DEBE leer `context.md` y `containers.md` además de `components.md` al arrancar un análisis; hoy no los lee ninguna skill.
- **CA-9** — Los tres archivos de `.sdd/c4/` DEBEN respetar el tope de 45 líneas (BR-082): si un nivel no entra, se parte por módulo (CA-3), no se deja crecer.

## Reglas de negocio afectadas

BR-037 (qué genera el agente al configurar), BR-069/070 (detección de módulos y capas), BR-072 (cuerpo de la rule de capa), BR-073 (`CLAUDE.md` de módulo — se amplía con símbolos de entrada), BR-074 (regeneración quirúrgica), BR-077 (dónde vive cada convención), BR-082 (tope de líneas). Las reglas nuevas se agregan a `.sdd/domain.md` antes de implementar.

## Supuestos

- **S-1** — "Símbolo de entrada" es lo que otros módulos importan de ese módulo: clases públicas, funciones exportadas, interfaces compartidas. No se listan los internos.
- **S-2** — El formato de tabla de `components.md` se define en esta tarea y sddkit lo dogfoodea sobre sí mismo, que es un repo de un solo módulo (CA-4).
- **S-3** — No se migran los `.sdd/c4/` de repos ya configurados: el formato nuevo aplica desde el próximo escaneo.

## Fuera de alcance

- **El chequeo de drift sin CLI** (H2, postergado): es la tercera mejora propuesta y queda para otra tarea.
- **Verificar qué carga un subagente** (H1): el dev lo valida por su cuenta.
- Los niveles 1 y 2 no se fusionan ni se eliminan: solo pasan a leerse (CA-8).

---
_Aprobación del dev: aprobada 2026-08-14_
