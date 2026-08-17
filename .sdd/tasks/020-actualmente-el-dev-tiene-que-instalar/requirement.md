# Requisito original — tarea 020

> Capturado verbatim el 2026-08-09. **No editar este archivo**: el refinamiento va en spec.md.

Actualmente el dev tiene que instalar sddkit, yo lo hago con npm link, y luego tiene que ejecutar sdd setup o sdd init, no lo recuerdo. Quiero remover eso, en su lugar quiero que sddkit se instale como un plugin de claude. Y el dev no tenga que hacer absolutamente nada, solo responder preguntas si sddkit se lo plantea. Para esto me imagino que tiene que crear un archivo setup.json dentro del repo, y validar que exista y tenga toda la configuracion que requiere.
