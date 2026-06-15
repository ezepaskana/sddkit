# ADR 0005 — Scanner de Terraform vía `terraform show -json`, solo metadatos

- **Fecha:** 2026-06-12 · **Estado:** aceptada
- **Tarea relacionada:** .sdd/tasks/001

## Contexto

Fase 3 necesita extraer del código de infraestructura (Terraform) las aristas de infra del grafo: recursos compartibles (S3, SQS, SNS, DynamoDB, RDS, EventBridge), bindings IAM, cableados de eventos y mapeos env-var → recurso. Había que decidir cómo leer ese código sin comprometer seguridad ni robustez.

## Decisión

El scanner de infraestructura parsea el **output de `terraform show -json`** (sobre un plan o state ya resuelto por Terraform — variables, módulos y `for_each`/`for` ya están evaluados). Extrae **solo metadatos**: tipos de recurso, nombres, ARNs, policies/acciones IAM. **Nunca** extrae `values` del state (pueden contener secretos o datos sensibles), y **nunca** parsea HCL crudo con regex.

## Alternativas consideradas

- **Regex sobre HCL crudo:** descartado explícitamente — variables, módulos remotos y `for_each`/`for` hacen que cualquier regex sea frágil al punto de ser inútil (el mismo recurso puede generarse N veces con nombres dinámicos).
- **Parser HCL completo / provider de Terraform como librería:** no descartado para siempre, pero no es la base de v1 — agrega una dependencia pesada y complejidad de resolución de módulos remotos. Si `terraform show -json` no alcanza para algún caso, se reevalúa en una iteración de Fase 3.
- **Extraer `values` del state para enriquecer el grafo:** descartado por seguridad — el grafo central (Fase 2, sin auth/multi-tenant en v1, ver alcance) no es un lugar seguro para secretos ni datos de producción.

## Consecuencias

- Requiere que el repo de infra tenga un `plan` o `state` aplicable disponible para generar el `-json` (no funciona sobre HCL "suelto" sin inicializar/planificar).
- No captura recursos gestionados fuera de Terraform (creados a mano en la consola, o por otras herramientas) — son invisibles para el grafo.
- El output de `-json` puede ser grande; el scanner debe filtrar a los tipos de recurso relevantes (S3, SQS, SNS, DynamoDB, RDS, EventBridge, IAM, ECS/Lambda para env-vars) en vez de procesarlo completo.
