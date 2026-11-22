# Receta: Web y Frontend

## 1. Qué se comprueba
- Typecheck, compilación (`build`) y tests unitarios/de componentes pasan sin fallos.
- El flujo real funciona de punta a punta en navegador o servidor HTTP local (0 errores en consola, 0 `5xx` inesperados).
- El diseño se mantiene legible en escritorio (`1280x800`) y móvil (`375x812`).
- Accesibilidad básica: etiquetas en inputs, foco de teclado navegable y contraste suficiente.

## 2. Herramientas
- Compilación y pruebas: `npm run typecheck`, `npm run build`, `npm test` (o comandos del equipo).
- E2E y visual: Playwright, Cypress o capturas/grabaciones de navegador de Antigravity.

## 3. Evidencia producida
- Resultado ejecutado en `.agents/evidence/report.{md,json}` (`mtsk verify`).
- Capturas en escritorio y móvil dentro de `preview/` enlazadas con `file: preview/<nombre>.png` (o `preview/web-verification.md` si no hay navegador sin interfaz).

## 4. Errores típicos que busca el revisor
- Dar por buena la web solo porque `build` salió con código `0` sin probar la página real.
- Devolver JSON en `GET /` cuando se pidió interfaz HTML, o lanzar `500` en lugar de `400` ante un formulario inválido.
- Desbordamiento horizontal en móvil (`375px`) o errores ocultos en consola/red.
- Botones o formularios sin acción real detrás.
