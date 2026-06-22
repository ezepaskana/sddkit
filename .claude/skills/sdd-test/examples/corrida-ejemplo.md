# Ejemplo: corridas típicas de sdd test

## Caso 1 — Tests en verde (nativo, Node.js)

```
$ sdd test
[sdd-test] ⚠ Docker no disponible — corriendo NATIVO (el entorno local puede afectar el resultado)
[sdd-test] → npm test --silent

  ✓ task verify ejecuta "cmd: ..." sin backticks (0.8ms)
  ✓ task verify ejecuta "`cmd: ...`" envuelto en code span (1.2ms)
  ✓ sdd task new crea analysis.md con sección "Análisis crítico" (180ms)
  ...
  # tests 213
  # pass 213
  # fail 0

$ echo $?
0
```

El orquestador ve exit 0 → marca el checkbox del paso como verificado.

---

## Caso 2 — Tests en rojo (paso de test-first, esperado)

```
$ sdd test
[sdd-test] → npm test --silent

  ✖ doctor reporta hook post-commit instalado (15ms)
    AssertionError: expected '' to contain 'post-commit: ok'
  ✓ doctor reporta hook post-commit ausente (2ms)

  # tests 2
  # pass 1
  # fail 1

$ echo $?
1
```

Exit 1 → el paso de "escribir tests" está verificado (los tests existen y fallan como se espera). El orquestador marca el checkbox. El siguiente paso implementa el código para ponerlos en verde.

---

## Caso 3 — Con Docker (Dockerfile.test)

```
$ sdd test
[sdd-test] Dockerfile.test → build + run (reproducible)
  ...
  # tests 213
  # pass 213
  # fail 0

$ echo $?
0
```

Máxima reproducibilidad: misma imagen en la máquina del dev y en CI.

---

## Caso 4 — Error de entorno (ni tests ni Docker)

```
$ sdd test
[sdd-test] ✖ No pude determinar cómo correr los tests. Completá CONFIG.nativeCmd en .sdd/run-tests.mjs

$ echo $?
2
```

Exit 2 → no es un fallo de tests, es un problema de configuración. Arreglar el script, no volver al modo manual.
