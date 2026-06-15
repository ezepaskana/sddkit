# Estrategias Docker para tests reproducibles

**Por qué**: los tests nativos dependen del entorno de la máquina (versión de runtime, variables, servicios instalados). Docker congela eso: el mismo test corre igual en la máquina del dev, la de su colega y el CI.

## De mejor a aceptable

1. **`Dockerfile.test`** (recomendado si los tests necesitan toolchain específico): imagen dedicada que copia el repo, instala dependencias y define `CMD` con los tests. Cacheable, versionada en git.
2. **Servicio `test` en docker-compose** (recomendado si los tests necesitan DB/cache/colas): define el servicio con `depends_on` a los servicios reales. `docker compose run --rm test` levanta todo, corre y limpia.
3. **Imagen estándar + volumen** (cero archivos extra): `docker run --rm -v "$PWD:/app" -w /app node:20 sh -c "npm test"`. Sirve para stacks autocontenidos; las dependencias se instalan en cada corrida salvo cache de volumen.
4. **Nativo** (fallback): cuando no hay Docker. Aceptable para desarrollo rápido; el CI debería usar 1-3.

## Gotchas

- Montar volumen en Windows: usar rutas con `/` (el template ya lo maneja).
- `node_modules`/`target` del host pueden contaminar el contenedor: para máxima limpieza usar Dockerfile.test (COPY) en vez de volumen.
- Tests que escriben archivos: asegurarse de que escriban dentro del workdir montado o en /tmp del contenedor.
