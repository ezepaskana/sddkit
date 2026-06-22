# Retro - tarea 005: Ajustar sdd-analyze y sdd-specify

## Metrica

- **Antes:** 1 archivo monolitico (spec.md) con analisis critico + clarificacion + metrica + spec refinada.
- **Despues:** 2 archivos separados: analysis.md (analisis, clarificacion, metrica opcional) y spec.md (historia, EARS, BRs, fuera de alcance, impacto). Nuevo estado `analyzed` como gate intermedio.
- **Resultado:** separacion completa, 213/213 tests en verde, AGENTS.md regenerado.

## Desvios del plan

Ninguno significativo. Los 8 pasos se ejecutaron segun el plan. El unico ajuste fue que la verificacion del paso 3 tenia un falso negativo por `grep -v ExperimentalWarning` (el subagente lo detecto y verifico por separado).

## Aprendizajes

- **Verificaciones con `grep -v` en pipelines `&&` pueden dar falso negativo**: si `grep -v` no encuentra lineas que dejar pasar, sale con exit code 1 (no encontro nada), cortando la cadena `&&`. Usar `2>/dev/null` o redirigir stderr en vez de `grep -v` para filtrar warnings en verificaciones.
