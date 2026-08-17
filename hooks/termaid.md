# sddkit — termaid no está instalado

> Este texto se vuelca al contexto del agente cuando el repo **sí** está configurado pero `termaid` no está en el `PATH` y el dev todavía no respondió sobre él.

sddkit vuelca los artefactos en la terminal para que el dev los lea sin cambiar de ventana (BR-063). Los diagramas Mermaid que llevan esos artefactos —sobre todo el `analysis.md`— son ilegibles como texto crudo.

[termaid](https://github.com/fasouto/termaid) los renderiza en la terminal. Es Python puro, sin dependencias.

**Qué hacer, la próxima vez que le muestres un artefacto con un diagrama al dev:** ofrecéselo **en una línea**, sin interrumpir lo que estén haciendo. Por ejemplo:

> _"El diagrama va a salir como texto crudo. Si querés que lo renderice: `pip install termaid` (o lo corro con `uvx termaid` sin instalar nada). ¿Lo instalás?"_

**Reglas del ofrecimiento (BR-087, ADR-0017):**

1. **Una sola vez.** Apenas el dev responda, escribí su respuesta en `.sdd/config.json → ui.termaid`: `"si"` si aceptó, `"no"` si rechazó.
2. **Con cualquiera de los dos valores, no vuelvas a ofrecerlo nunca.** Un "no" vale tanto como un "sí" para callar el ofrecimiento.
3. **No instales nada por tu cuenta.** La instalación la ejecuta el dev, o vos con su ok explícito en ese momento.
4. **Sin termaid, el flujo sigue igual**: mostrás el bloque Mermaid crudo y no es un error.

Si el dev no responde y sigue trabajando, no insistas: volvé a la tarea que estaban haciendo.
