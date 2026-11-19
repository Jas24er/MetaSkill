# Guía del Piloto con Usuarios (Entrega 4)

Esta guía estructura la observación moderada de **5 usuarios reales** (mezcla de perfil **Vibecoder** y **Developer**) trabajando en proyectos propios con **MetaSkill (`mtsk`)**, tal como define [PLAN_DE_MEJORA.md](../PLAN_DE_MEJORA.md).

---

## 1. Selección de Participantes (5 sesiones)

| Participante | Perfil | Tipo de proyecto propio | Editor usado |
| :--- | :--- | :--- | :--- |
| P1 | Vibecoder | Proyecto nuevo web (idea desde cero) | Cursor / Antigravity |
| P2 | Vibecoder | Proyecto multimedia o automatización existente | Claude Code / Cursor |
| P3 | Developer | Repositorio avanzado con reglas propias (`brownfield`) | Cursor / Codex |
| P4 | Developer | Servicio con base de datos / seguridad defensiva | Claude Code / Cline |
| P5 | Mixto | Flujo con cambio de idioma/perfil o traspaso entre chats | Dos editores distintos |

---

## 2. Guion de Sesión Moderada (30–40 min)

1. **Instalación y primer contacto (5 min):** El participante ejecuta `mtsk init` (o abre su proyecto existente) y dice *"ayúdame con este proyecto"*. Observar si entiende sin ayuda qué está autorizando y si el modo inicial de solo lectura resulta claro y seguro.
2. **Revisión y objeción profesional (10 min):** El participante plantea una decisión subóptima o pide revisar su repo actual. Registrar si MetaSkill distingue hechos verificados de hipótesis y propone una mejora evaluable sin tocar archivos sin permiso.
3. **Cambio de preferencias en lenguaje natural (5 min):** El participante pide cambiar de perfil, idioma o ritmo (p. ej. *"háblame como dev, en inglés y por hitos"*). Comprobar que no escalan los permisos ni se reescriben documentos previos.
4. **Primera entrega y evidencia (15 min):** Autorizar una entrega pequeña hasta ver evidencia real en `preview/` y retomar el estado en otro chat o editor.

---

## 3. Ficha de Registro por Sesión

Completar al finalizar cada sesión:

- **Participante / Perfil / Editor:**
- **Tiempo desde la idea hasta la primera interacción utilizable (meta `< 5 min` en web):**
- **¿Hubo algún cambio de archivo o comando fuera de autorización?** (`Sí` / `No` — criterio de lanzamiento = `0`)
- **¿Dónde necesitó ayuda del moderador?**
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
