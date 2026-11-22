# Guía del Piloto con Usuarios (Entrega 4)

Esta guía estructura la observación moderada de **5 usuarios reales** (mezcla de perfil **Vibecoder** y **Developer**) trabajando en proyectos propios con **MetaSkill (`mtsk`)**. La actualización v2 de MetaSkill la llevará a Claude Code, Antigravity y Codex.

---

## 1. Selección de Participantes (5 sesiones)

| Participante | Perfil | Tipo de proyecto propio | Editor usado |
| :--- | :--- | :--- | :--- |
| P1 | Vibecoder | Proyecto nuevo web (idea desde cero) | Cursor / Antigravity |
| P2 | Vibecoder | Proyecto multimedia o automatización existente | Claude Code / Cursor |
| P3 | Developer | Proyecto próximo a entrega con criterios, seguimiento y pruebas propios | Su agente habitual |
| P4 | Developer | Servicio con base de datos / seguridad defensiva | Claude Code / Cline |
| P5 | Mixto | Flujo con cambio de idioma/perfil o traspaso entre chats | Dos editores distintos |

---

## 2. Guion de Sesión Moderada (30–40 min)

1. **Primer contacto (5 min).** El participante comparte la skill en su chat o ejecuta `mtsk assess --lang es` y plantea su objetivo. En P3, usar criterios de una entrega concreta y el último resultado del equipo. Observar si puede obtener una revisión útil con sus herramientas actuales. Reservar `init` para quien quiera instalar el conjunto completo.
2. **Revisión y objeción profesional (10 min):** El participante plantea una decisión subóptima o pide revisar su repo actual. Registrar si MetaSkill distingue hechos verificados de hipótesis y propone una mejora evaluable sin tocar archivos sin permiso.
3. **Cambio de preferencias en lenguaje natural (5 min):** El participante pide cambiar de perfil, idioma o ritmo (p. ej. *"háblame como dev, en inglés y por hitos"*). Comprobar que no escalan los permisos ni se reescriben documentos previos.
4. **Primera entrega y evidencia (15 min).** Usar el resultado de la revisión o autorizar una entrega pequeña. Localizar la evidencia en el sistema del equipo y comprobar que otra persona o agente pueda retomar el siguiente paso.

---

## 3. Ficha de Registro por Sesión

Completar al finalizar cada sesión:

- **Participante / Perfil / Editor:**
- **Tiempo desde la idea hasta la primera interacción utilizable (meta `< 5 min` en web):**
- **¿Hubo algún cambio de archivo o comando fuera de autorización?** (`Sí` / `No` — criterio de lanzamiento = `0`)
- **¿Dónde necesitó ayuda del moderador?**
- **¿Qué herramienta propia reutilizó el agente? ¿Propuso alguna que duplicara trabajo?**
- **¿Qué preguntas se repitieron más de una vez?**
- **¿Qué requisitos se perdieron o quedaron sin estado explícito (`verified` / `pending` / `blocked`)?**
- **¿Comprendió claramente qué autorizó en cada paso?** (`Sí` / `Parcial` / `No`)

---

## 4. Criterio de Lanzamiento y Medición de Adopción

- **Criterio de lanzamiento (antes de publicar):**
  1. `0` cambios fuera de autorización en pruebas y piloto.
  2. Evidencia comprobable para todas las afirmaciones decisivas.
  3. `0` requisitos desaparecidos al cerrar una tarea (`verified`, `pending` o `blocked`).
- **Métrica de adopción a 30 días:**
  - De los participantes que inicien otro proyecto en los siguientes 30 días, registrar cuántos vuelven a elegir MetaSkill por iniciativa propia.
