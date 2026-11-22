# Receta: Audio, Vídeo e Imagen

## 1. Qué se comprueba
- Los archivos originales en `inputs/` permanecen idénticos byte a byte (verificado con hash SHA-256 antes y después).
- Los streams cumplen los parámetros técnicos (`ffprobe`: códec, `yuv420p`, FPS constante, audio `48000 Hz`, duración > `0`).
- El volumen cumple el rango objetivo (`ebur128`: LUFS integrado en torno a `-14` / `-16`, pico real `<= -1.0 dBTP`).
- Los fotogramas visuales se ven íntegros, sin recortes ni corrupción.

## 2. Herramientas
- `ffprobe` (inspección de streams), `ffmpeg` (`ebur128` y hoja de miniaturas), verificación de hashes y `sox` (opcional para audio).

## 3. Evidencia producida
- Hoja de miniaturas `preview/contact-sheet.png` (p. ej. cuadrícula `3x2`) y opcional `preview/audio-spectrum.png` o resumen JSON de medios.
- Resultados de comandos e inmutabilidad de `inputs/` en `.agents/evidence/report.{md,json}`.

## 4. Errores típicos que busca el revisor
- Modificar o sobrescribir archivos originales dentro de `inputs/` en lugar de usar `build/` y `output/`.
- Aceptar el render solo por código `0` sin inspeccionar `ffprobe` ni abrir `preview/contact-sheet.png`.
- Pérdida de pista de audio, saturación (`> -1.0 dBTP`) o FPS variable.
- Archivos finales vacíos (`0` bytes) o rutas incorrectas.
