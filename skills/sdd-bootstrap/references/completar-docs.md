# Completar los `❓` — el paso que da valor

Después de la Fase 4 los docs quedan con huecos `❓ VALIDAR`. Muchos los puede responder el código; esos **no** se le preguntan al dev. Este paso los llena con subagentes de contexto acotado, y vos —el orquestador— hacés los edits.

**Por qué con subagentes:** leer `models/`, cada módulo y la documentación entera te llenaría el contexto de detalle que no vas a volver a usar. Cada subagente lee su recorte, devuelve una o dos líneas y se descarta.

**Definition of done: cero `❓` que las fuentes o el código puedan responder.** Los que quedan son los que de verdad necesitan al dev.

## 1. Arquitectura y negocio — un subagente `medio`/`fuerte`

Acotado a las fuentes de documentación que anotaste en `.sdd/QUESTIONS.md` (`README`, `docs/`, ADRs, `CONTRIBUTING`). **No debe leer código más allá de eso.**

**Encargo:** responder los `- [ ]` de `context.md`, `containers.md` y las secciones de `domain.md` distintas de las entidades — actores, sistemas externos, responsabilidad de cada contenedor, glosario, flujos clave. Que devuelva las respuestas, no que edite.

Puede devolver hasta 3 preguntas sin responder: esas quedan en `QUESTIONS.md` y se las hacés al dev al cerrar.

## 2. Entidades — subagentes `rapido`, read-only, en paralelo

Una por cada entidad sembrada en `domain.md`, acotado a `models/`, `entities/` o `domain/`.

**Encargo, literal:** _"buscá el archivo de la entidad `<Nombre>` y devolvé 1-2 líneas: qué representa en el negocio y cuál es su ciclo de vida"_.

En tandas si son muchas. Sin `Edit` ni `Write`: solo devuelven texto.

## 3. Módulos — subagentes `rapido`, read-only, en paralelo

Uno por cada módulo con la responsabilidad todavía en `❓`, acotado **solo** a los archivos bajo ese módulo. Para el módulo raíz (`.`), solo los archivos sueltos de la raíz, sin entrar en otras carpetas.

**Encargo:** _"¿cuál es el rol de este módulo en una frase corta, y qué símbolos expone que otros módulos importen?"_ — los símbolos de entrada son lo que después evita abrir el paquete entero (BR-073).

## 4. Los edits los hacés vos

Con todas las respuestas juntas, **un solo writer por archivo**: vos. Por cada respuesta, reemplazá el `❓` correspondiente y marcá su checkbox en la sección `## ❓ VALIDAR con el equipo` del archivo de origen. Actualizá también `.sdd/QUESTIONS.md`: lo respondido sale de la lista.

Nunca dejes un checkbox marcado con el hueco sin reemplazar, ni al revés: la marca es lo que le dice al próximo agente que ya no hace falta buscar.

## 5. Verificación

No hay comando que valide esto (ADR-0016): **el gate sos vos**. Contá los huecos antes y después —`grep -c '❓' .sdd/c4/*.md .sdd/domain.md`— y confirmá que bajó. Después revisá a mano que no haya quedado ningún `…` sin reemplazar y que cada nivel C4 siga entrando en 45 líneas (BR-082).

Lo que quedó sin responder se lo preguntás al dev en el resumen final, en una línea cada uno.
