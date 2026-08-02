# Ejemplo: corridas típicas de `sdd test`

## Verde (nativo)

```
$ sdd test
[sdd-test] ⚠ Docker no disponible — corriendo NATIVO (el entorno local puede afectar el resultado)
[sdd-test] → npm test --silent
  # tests 213 · pass 213 · fail 0
$ echo $?    # → 0
```

Exit 0 → el orquestador marca el checkbox del paso.

## Rojo esperado (paso test-first)

```
$ sdd test
  ✖ doctor reporta hook post-commit instalado
    AssertionError: expected '' to contain 'post-commit: ok'
  # tests 2 · pass 1 · fail 1
$ echo $?    # → 1
```

Exit 1 → el paso "escribir tests" **está verificado**: existen y fallan como se espera. El paso siguiente los pone en verde. En una tarea `bug`, este es el test rojo de regresión — confirmá que falla por el motivo correcto, no por otro error.

## Con Docker (`Dockerfile.test`) y error de entorno

```
$ sdd test
[sdd-test] Dockerfile.test → build + run (reproducible)     # misma imagen que en CI
  # tests 213 · pass 213 · fail 0

$ sdd test
[sdd-test] ✖ No pude determinar cómo correr los tests. Completá CONFIG.nativeCmd en .sdd/run-tests.mjs
$ echo $?    # → 2
```

Exit 2 no es fallo de tests sino de configuración: arreglá el script, no vuelvas al modo manual.
