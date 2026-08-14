# sddkit — este repo todavía no está configurado

> ⚠️ **PLACEHOLDER — redactar en una tarea posterior.** El contrato del hook ya está fijado (tarea 020, BR-080): este archivo se vuelca al contexto del agente cuando el repo NO tiene `.sdd/config.json`. Lo que falta es el texto real de las instrucciones.

El plugin sddkit está instalado pero este repositorio no tiene `.sdd/config.json`, así que el framework no está operativo acá.

**Qué hacer:** investigá el repo y generá la configuración de sddkit, preguntándole al dev únicamente lo que no puedas deducir del código.

## Al escribir `.sdd/config.json`: ofrecé termaid (BR-087, ADR-0017)

Este es el **único momento** en que corresponde ofrecerlo durante el bootstrap: el hook que lo ofrece en repos ya configurados no dispara acá, porque cuando arrancó la sesión el config todavía no existía. Si no lo hacés ahora, el dev recién lo va a ver en la próxima sesión.

sddkit vuelca los artefactos en la terminal y sus diagramas Mermaid son ilegibles como texto crudo. [termaid](https://github.com/fasouto/termaid) los renderiza. Ofrecéselo **en una línea**, junto con el resto de lo que estés confirmando:

> _"¿Instalás termaid para que los diagramas se vean en la terminal? `pip install termaid` (o lo corro con `uvx termaid`, sin instalar nada)."_

Escribí su respuesta en `.sdd/config.json → ui.termaid`: `"si"` o `"no"`. **Con cualquiera de los dos valores no se vuelve a ofrecer nunca** — un "no" vale tanto como un "sí" para callar el ofrecimiento. Si el dev no contesta, dejá el campo sin escribir: el hook lo ofrecerá en la próxima sesión.

No instales nada por tu cuenta: la instalación la ejecuta el dev, o vos con su ok explícito en ese momento.

---

_(El detalle de qué investigar, en qué orden, qué preguntar y con qué formato escribir el resto de `.sdd/` se redacta en una tarea siguiente.)_
