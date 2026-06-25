# Analysis — tarea 008: Bug: sdd publish no encuentra better-sqlite3 instalado globalmente

> Estado: borrador. El agente completa este archivo tras analizar el repo y clarificar con el dev. El dev debe APROBARLO antes de especificar.

## Análisis crítico

- **¿Qué problema real resuelve?**
  `sdd publish` falla con "⚠ Falta una dependencia opcional" aunque `better-sqlite3` sí está instalado globalmente. Esto hace que la feature de grafo SQLite sea inutilizable en instalaciones globales estándar (`npm i -g sddkit && npm i -g better-sqlite3`), que es la forma de instalación documentada.

- **¿Ya existe algo en el repo (o una librería) que lo resuelve total o parcialmente?**
  El mecanismo de inyección `deps.importSqlite` en `createSqliteStore` (`sqlite.js:73`) existe pensado para tests, no para resolver el problema de paths globales. No hay otro mecanismo de resolución alternativo en el código actual.
  
  `createRequire` de `node:module` (disponible sin instalar nada, parte del runtime de Node) usa el algoritmo de resolución CJS que sí traversa correctamente `{prefix}/lib/node_modules/sddkit/` hacia arriba hasta `{prefix}/node_modules/`. Es la solución estándar de Node.js para este problema exacto.

- **¿Hay una alternativa más simple que logre el 80% del valor con el 20% del esfuerzo?**
  - **Symlink manual** (workaround documentado en el bug): no escala, requiere que cada usuario lo aplique manualmente.
  - **`import.meta.resolve` + dynamic import**: `import.meta.resolve` también usa ESM resolution y tiene el mismo problema de traversía.
  - **`createRequire(import.meta.url)`**: una línea de import + cambiar el default de `importSqlite`. Cambio mínimo, sin nuevas dependencias, sin cambiar la API pública ni los tests existentes.
  - **Instalar `better-sqlite3` como `peerDependency` dentro del scope de sddkit**: exigiría `npm install --prefix $(npm root -g)/../lib/node_modules/sddkit better-sqlite3`, que es peor UX que el workaround actual.
  
  `createRequire` es la alternativa más simple y correcta.

- **Supuestos del dev que podrían no ser ciertos:**
  - *"createRequire resuelve el problema"*: **verificado**. `createRequire(import.meta.url)` genera un resolver CJS desde el directorio del módulo, cuyo algoritmo recorre hacia arriba incluyendo `{prefix}/node_modules/` — exactamente donde `npm i -g` instala `better-sqlite3`. Documentado en [Node.js docs](https://nodejs.org/api/module.html#modulecreaterequirefilename).
  - *"El cambio no rompe tests"*: **verificado**. Los tests usan `deps.importSqlite` para inyectar un mock (línea 34) o testean con `better-sqlite3` real (líneas 44–195, con skip si no está). Cambiar el default interno no afecta ni el path de inyección ni los tests con la lib real.
  - *"El comportamiento de error (missing-dependency) se preserva"*: **verificado**. Si `better-sqlite3` no está instalado en ningún lugar accesible, `_require('better-sqlite3')` lanza `MODULE_NOT_FOUND`. `isModuleNotFound` en `index.js:71` ya cubre ese código (`err.code === 'MODULE_NOT_FOUND'`) junto a `ERR_MODULE_NOT_FOUND`, así que el degradado a `{ok:false, reason:'missing-dependency'}` sigue funcionando.

- **Riesgos y efectos secundarios:**
  - *Shape del módulo*: `import('better-sqlite3')` devuelve `{ default: Database }` (ESM wrapping CJS); `require('better-sqlite3')` devuelve `Database` directamente. El wrapper `() => Promise.resolve().then(() => ({ default: _req('better-sqlite3') }))` normaliza la forma a `{ default: Database }`, preservando el `const { default: Database } = await importSqlite()` en la línea 77 sin cambios.
  - *Errores síncronos → Promise.reject*: `Promise.resolve().then(() => ...)` convierte cualquier `throw` síncrono dentro del callback en un rechazo de Promise. Mismo comportamiento que `import()`. ✓
  - *`createRequire` en ESM*: disponible desde Node 12.2 (LTS). El `engines.node` del proyecto es `>=18`. No hay riesgo de compatibilidad.
  - *mysql.js*: también usa `import('mysql2')` pero ese paquete normalmente se instala como peer del proyecto que usa sddkit (no globalmente), así que el problema es menos probable. No está en el scope de este fix; si se necesita, es análogo.

- **¿Qué pasa si NO se hace?**
  La feature de grafo SQLite sigue siendo inutilizable en instalaciones globales estándar. El workaround (symlink manual) no es documentable de forma oficial sin inducir a error. Cada nuevo usuario que siga la guía de instalación obtendrá el error.

- **Si esta funcionalidad puede fallar en uso real, ¿cómo nos enteraríamos (detección) y cómo debería reaccionar el sistema (manejo)?**
  - Si `better-sqlite3` no está instalado en ningún lugar: `_require()` lanza → `isModuleNotFound` lo captura → `{ok:false, reason:'missing-dependency', install:'npm i better-sqlite3'}` → mismo mensaje de usuario que hoy. Degradación intacta.
  - Si `better-sqlite3` está instalado en el scope correcto (global o local): funciona. ✓
  - No se introduce nueva lógica que pueda fallar de formas nuevas.

**Recomendación:** `proceder` — fix mínimo (2 líneas), correcto, sin efectos secundarios. La causa raíz está bien identificada y el mecanismo de corrección es estándar en el ecosistema Node.

## Preguntas de clarificación

No hay preguntas pendientes. La causa raíz, el fix y los efectos secundarios están verificados con el código del repo.

## Métrica de impacto

- **Métrica:** `sdd publish` con `graph.driver: sqlite` en una instalación global sale con código 0 y publica (en lugar de imprimir el warning de dep faltante).
- **Baseline actual:** el comando falla con "⚠ Falta una dependencia opcional" aunque `better-sqlite3` esté instalado globalmente.
- **Resultado esperado:** el comando ejecuta sin el warning cuando `better-sqlite3` está en cualquier ubicación accesible vía CJS resolution (global o local).
- **Cómo se mide después:** test de integración que simula el path global con un `createRequire` real; o verificación manual en instalación global post-publicación.

---
_Aprobación del dev: aprobado 2026-06-25_
