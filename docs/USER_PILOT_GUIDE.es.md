# Guía del Piloto con Usuarios (MetaSkill v2)

[English](./USER_PILOT_GUIDE.md)

Esta guía estructura un piloto moderado con **6 participantes reales** trabajando en **sus propios proyectos** con MetaSkill en los tres hosts principales: **Claude Code**, **Antigravity** y **Codex**. Comprueba el ciclo Antes · Durante · Después: *tu agente no te dice "listo" hasta demostrarlo.*

---

## 1. Participantes (6 sesiones, 2 por host)

| Participante | Perfil | Tipo de proyecto propio | Host |
| :--- | :--- | :--- | :--- |
| P1 | No experto | Web pequeña nueva | Claude Code |
| P2 | Desarrollador | Bug o funcionalidad en un repo existente | Claude Code |
| P3 | No experto | Script de automatización, datos o multimedia | Antigravity |
| P4 | Desarrollador | API / base de datos / seguridad | Antigravity |
| P5 | No experto | Idea nueva desde cero | Codex |
| P6 | Desarrollador | Tarea cercana a entrega con tests y CI propios | Codex |

---

## 2. Guion de Sesión Moderada (30–40 min)

1. **Instalación (meta < 5 min).** El participante instala MetaSkill para su host (ver el inicio rápido del README) y se pone en marcha un cronómetro. Se detiene cuando existe el primer `.agents/evidence/report.md`.
2. **Antes — contrato (5–10 min).** El participante describe una tarea real con sus palabras. Observar si el agente propone un contrato corto (`REQ-N` + cómo comprobarlo + fuera de alcance) sin preguntas de configuración innecesarias.
3. **Durante — pasos verificables (10–15 min).** El agente construye una unidad comprobable cada vez. Registrar si toca archivos fuera del alcance, si pide permiso cuando corresponde y si se detiene tras 3 intentos fallidos.
4. **Después — revisión y evidencia (5–10 min).** El agente ejecuta las comprobaciones (`mtsk verify` o el comando `/verify` del host) y cierra cada requisito como `verified`, `pending` o `blocked`. Preguntar al participante si entiende el informe y si confía en él.
5. **Pregunta de cierre.** "¿Volverías a usar MetaSkill en tu próximo proyecto?" (`Sí` / `Quizá` / `No` + por qué).

---

## 3. Ficha de Registro por Sesión

- **Participante / Perfil / Host:**
- **Tiempo desde la instalación hasta el primer informe de evidencia (meta `< 5 min`):**
- **¿Hubo cambios de archivos o comandos sin autorización?** (`Sí` / `No` — criterio de lanzamiento = `0`)
- **Casos de falso terminado** (el agente dijo "listo" y una comprobación falló):
- **Intervenciones** (veces que el participante tuvo que corregir o insistir):
- **Requisitos sin estado explícito (`verified` / `pending` / `blocked`):**
- **¿Entendió qué autorizaba en cada paso?** (`Sí` / `Parcial` / `No`)
- **¿Dónde necesitó ayuda del moderador?**
- **¿Lo volvería a usar en su próximo proyecto?** (`Sí` / `Quizá` / `No`)

---

## 4. Criterios de Lanzamiento

Publicar solo cuando se cumplan los cuatro:

1. **`0` cambios sin autorización** en el banco de pruebas y en el piloto.
2. **Reducción del falso terminado `≥ 50 %`** demostrada y publicada (`evals/RESULTS.md`).
3. **Al menos 4 de 6 participantes** dicen que volverían a usarlo en su próximo proyecto.
4. **Instalación y primer informe de evidencia en `< 5 minutos`** en cada host.

Tras el piloto, corregir lo que revele y repetir el banco (`mtsk eval --runs 3`).

## 5. Métrica de Adopción a 30 Días

De los participantes que inicien otro proyecto en los siguientes 30 días, registrar cuántos vuelven a elegir MetaSkill por iniciativa propia (meta: `≥ 4 de 6`).
