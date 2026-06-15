# EARS — Easy Approach to Requirements Syntax

Formato para criterios de aceptación testeables y sin ambigüedad. Patrones:

| Patrón | Plantilla | Ejemplo |
|---|---|---|
| Ubicuo (siempre) | EL SISTEMA DEBE … | EL SISTEMA DEBE registrar cada login en el audit log |
| Por evento | CUANDO _(evento)_, EL SISTEMA DEBE … | CUANDO se crea una planta, EL SISTEMA DEBE asignarle estado "pendiente" |
| Por condición no deseada | SI _(condición de error)_, EL SISTEMA DEBE … | SI la planta no existe, EL SISTEMA DEBE responder 404 con código de error PLANT_NOT_FOUND |
| Por estado | MIENTRAS _(estado)_, EL SISTEMA DEBE … | MIENTRAS una planta esté inactiva, EL SISTEMA DEBE excluirla de la facturación |
| Opcional | DONDE _(feature aplica)_, EL SISTEMA DEBE … | DONDE el cliente tenga plan enterprise, EL SISTEMA DEBE permitir export a CSV |

Reglas: un comportamiento por criterio; verbos observables (responder, registrar, excluir — no "manejar", "soportar"); cada criterio debe poder convertirse en un test.
