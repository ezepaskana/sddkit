# Investigar el repo — qué detectar y en qué orden

Orden pensado para gastar poco: cada nivel usa lo que encontró el anterior, y ninguno lee código completo cuando un manifiesto alcanza. **Lo que no puedas responder no se inventa: se anota como `❓ VALIDAR`** en el archivo que corresponda.

## 1. La documentación que ya existe

Antes de leer una sola línea de código: `README*`, `CONTRIBUTING*`, `docs/`, `doc/`, `adr/`, `architecture/`, `AGENTS.md`, `CLAUDE.md`, wikis versionadas.

Ahí suele estar escrito lo que ibas a deducir: qué es el sistema, con quién habla, por qué está partido así. Anotá **las rutas** que usaste — van a `.sdd/QUESTIONS.md` como fuentes, para que la próxima investigación arranque de ahí.

Si el `README` contradice al código, **el código gana** y la contradicción es una pregunta para el dev.

## 2. Stack y módulos (BR-069)

Los módulos salen de los manifiestos, no del árbol de directorios:

| Ecosistema | Dónde miran los módulos |
|---|---|
| Node | `package.json → workspaces`, `pnpm-workspace.yaml`, `lerna.json` |
| Java | `<modules>` de `pom.xml`, `include` de `settings.gradle[.kts]` |
| Go | `use` de `go.work` |
| Python | `pyproject.toml` (+ `tool.uv.workspace` / `tool.poetry` si están) |
| Rust | `[workspace] members` de `Cargo.toml` |

Si no hay workspaces declarados, **el repo entero es un único módulo raíz (`.`)** — no lo partas por intuición. Cada módulo lleva `path` (relativo a la raíz), `name` y `tech`.

De paso salen el runtime y sus versiones, el gestor de paquetes, el framework y **el comando de tests** (scripts del manifiesto, o el default del ecosistema). Ese comando va a `.sdd/config.json`: es el que después usa cada paso de un plan.

## 3. Capas (BR-070)

Dentro de cada módulo, son capas los directorios cuyo nombre es un **rol conocido** — `controllers`, `handlers`, `routes`, `services`, `usecases`, `repositories`, `dao`, `models`, `entities`, `domain`, `jobs`, `workers`, `middleware`, `adapters` — **a cualquier profundidad**, no solo bajo `src/`.

Un directorio con nombre que no es un rol (`utils`, `common`, `lib`, `helpers`) **no es una capa** y no genera documentación propia. Una misma capa presente en varios módulos es **una sola** rule con varios globs (BR-071), no una por módulo.

Si el repo no tiene ninguna capa reconocible, no hay rules de capa. Es un resultado válido y frecuente.

## 4. Entidades y reglas de negocio

Fuentes, en orden de confianza: migraciones y esquema de base > `models/`, `entities/`, `domain/` > tipos compartidos > validaciones.

De cada entidad querés **una línea**: qué representa en el negocio y su ciclo de vida. Lo que solo se responde leyendo el negocio y no el código —cuándo se archiva, quién puede verla, qué la hace inválida— es `❓ VALIDAR`, no una suposición.

Las reglas de negocio (`BR-NNN`) se numeran desde `BR-001` en `.sdd/domain.md`, y solo se escribe la que puedas citar contra código o contra una respuesta del dev. Una regla inventada es peor que ninguna: es vinculante para todos los agentes que vengan después.

## 5. Convenciones repetidas → topics

Un **topic** es una decisión que el repo ya tomó más de una vez y de más de una forma: cómo se define un endpoint, cómo se maneja un error, cómo se accede a la base, cómo se nombra un test.

- **Una sola variante** en todo el repo → es una convención, no un topic: registrala directo en `.sdd/catalog.json`.
- **Dos o más variantes** → es un topic pendiente: va a `.sdd/patterns.json` con el conteo de archivos de cada variante y un ejemplo (`archivo:línea`) de cada una. **La elección es del dev**, no tuya (Fase 3 del `SKILL.md`).

No inventes topics de algo que aparece una vez. Un catálogo con tres decisiones reales sirve; uno con veinte inventadas hace que nadie lo lea.
