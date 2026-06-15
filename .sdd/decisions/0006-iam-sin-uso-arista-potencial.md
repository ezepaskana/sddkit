# ADR 0006 — Binding IAM sin uso corroborado en código = arista `potencial`

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

El scanner de Terraform (Fase 3) puede detectar que un rol IAM tiene permiso para, p.ej., `s3:PutObject` sobre un bucket. Eso no prueba que el código del sistema realmente escriba en ese bucket — permiso ≠ uso. Afirmar una arista de dependencia real solo a partir de un permiso generaría ruido y falsos positivos en `sdd impact`.

## Decisión

Las aristas de infraestructura derivadas **solo** de un binding IAM, **sin** un consumo/uso correspondiente detectado en código (por los detectores de Fase 1/3: llamadas al SDK de S3/SQS/etc., env-var → recurso, event source mappings), se marcan con un tipo/flag **`potencial`**. Informan ("tenés un permiso que quizás no estás usando"), no afirman una dependencia confirmada.

## Alternativas consideradas

- **No reportar permisos sin uso detectado:** descartado — pierde información valiosa; "este sistema tiene un permiso que no parece usar" es justamente uno de los hallazgos que F3 promete (sección 6, métrica F3: "aristas de infra que el dev no tenía documentadas").
- **Afirmar la arista como real (igual que una confirmada por código):** descartado — contradice "permiso ≠ uso" y degradaría la confianza en `sdd impact` (ya de por sí solo advertencia, ADR-0004).

## Consecuencias

- `sdd impact` (o el formato de salida del grafo) debe distinguir visualmente/textualmente aristas confirmadas vs `potencial` — detalle a definir en la spec de Fase 3.
- El cruce "permiso IAM" ↔ "uso en código" requiere que Fase 1/3 ya hayan detectado el uso correspondiente (p.ej., un cliente S3 con el nombre del bucket) — si Fase 1 no llega a cubrir un tipo de recurso, esas aristas quedarán como `potencial` por defecto hasta que se agregue el detector correspondiente.
