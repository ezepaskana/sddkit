# Spec — tarea 008: Bug: sdd publish no encuentra better-sqlite3 en instalación global

> Estado: borrador. El agente completa este archivo con la spec formal. El dev debe APROBARLO antes de planificar.

## Spec refinada

**Historia:** Como desarrollador que instala sddkit globalmente con `npm i -g sddkit` y `better-sqlite3` de forma separada, quiero que `sdd publish` encuentre el driver SQLite correctamente y que `sdd doctor` me informe si el driver está operativo, para no tener que hacer un symlink manual ni diagnosticar a ciegas cuando algo falla.

**Criterios de aceptación (formato EARS):**

- CUANDO `createSqliteStore` carga `better-sqlite3` usando el mecanismo por defecto (sin inyección de `deps.importSqlite`), EL SISTEMA DEBE usar `createRequire(import.meta.url)` para resolver el módulo, de modo que la resolución CJS traversa correctamente `{prefix}/node_modules/` además de `{prefix}/lib/node_modules/sddkit/node_modules/`.

- CUANDO `better-sqlite3` está instalado en `{prefix}/node_modules/` (instalación global separada) y `graph.driver === "sqlite"`, EL SISTEMA DEBE abrir la base de datos y publicar sin emitir el warning "⚠ Falta una dependencia opcional".

- CUANDO `better-sqlite3` no está instalado en ninguna ubicación accesible vía resolución CJS, EL SISTEMA DEBE retornar `{ok: false, reason: 'missing-dependency', install: 'npm i better-sqlite3'}` con el mismo mensaje de usuario que hoy (BR-025, ADR-0008).

- CUANDO se inyecta `deps.importSqlite` en `createSqliteStore` (caso de tests), EL SISTEMA DEBE usar esa función en lugar del mecanismo por defecto — el comportamiento de los tests no cambia.

- CUANDO el módulo se carga via `createRequire` y `better-sqlite3` está disponible, EL SISTEMA DEBE exponer `Database` con la misma forma que `import()` devuelve (`{ default: Database }`), de modo que el resto de `createSqliteStore` no requiere cambios.

- CUANDO se corre `sdd doctor` y `.sdd/config.json → graph.driver === "sqlite"`, EL SISTEMA DEBE intentar cargar `better-sqlite3` usando `createRequire(import.meta.url)` e informar:
  - `✓ better-sqlite3 disponible (driver sqlite operativo)` si el módulo se resuelve correctamente.
  - `⚠ better-sqlite3 no encontrado — instalalo con: npm i better-sqlite3` si el módulo no está accesible, sugiriendo la instalación.

- CUANDO se corre `sdd doctor` y `graph.driver` no es `"sqlite"` (o no hay `graph` configurado), EL SISTEMA NO DEBE emitir ningún mensaje relacionado con `better-sqlite3` (chequeo condicional, solo si el driver está activo).

**Reglas de negocio afectadas:**

- **ADR-0008** (vinculante): `better-sqlite3` es una `optionalDependency` cargada de forma perezosa. Este fix mantiene esa propiedad: si el módulo no está instalado, el error se detecta, se convierte en `{ok:false, reason:'missing-dependency'}` por `isModuleNotFound` en `index.js`, y se degrada con mensaje claro. No se convierte en dependencia obligatoria.
- **BR-025**: la degradación silenciosa de `sdd publish --hook` cuando falta la dependencia sigue intacta (el `{ok:false, reason:'missing-dependency'}` upstream es el mismo).
- No se introduce ninguna BR nueva. No se modifica `domain.md`.

**Fuera de alcance:**

- `mysql.js`: también usa `import('mysql2')`, pero ese paquete se instala en el scope del proyecto destino (no globalmente), así que el problema no se reproduce de la misma forma. Fix análogo queda para otra tarea si se reporta.
- Documentación de instalación global (README/guías): no se actualiza en esta tarea; el fix hace que el flujo existente funcione correctamente.
- Cambios en el mensaje de error para el caso `missing-dependency` en `sdd publish`: se preserva tal cual.
- Tests de integración contra una instalación global real: fuera del entorno de CI estándar; la verificación usa el mecanismo de inyección existente.
- Chequeo de `better-sqlite3` en `sdd doctor` cuando el driver es `mysql` o no está configurado.

**Impacto en arquitectura/catálogo:**

- **Módulos afectados:** `src/lib/graphstore/sqlite.js` (fix de resolución, ~2 líneas) y `src/commands/doctor.js` (chequeo condicional de `better-sqlite3`, ~6 líneas).
- **Catálogo:** `module-system → esm` sigue vigente. `createRequire` es una API de Node.js (`node:module`) usada desde código ESM — práctica estándar, no introduce una variante CJS en el código fuente.
- **ADR-0008:** no requiere revisión; el fix mantiene todos los invariantes declarados.
- **C4:** sin cambios estructurales. No se agregan módulos, dependencias externas ni stores nuevos.
- **ADR nuevo:** no requerido.

---
_Aprobación del dev: aprobado 2026-06-25_
