# Receta: Bug en Proyecto Existente

## 1. Qué se comprueba
- Un test mínimo reproduce exactamente el fallo reportado *antes* de corregir el código (demostrando que fallaba con el bug).
- Ese mismo test de regresión pasa *después* de la corrección junto a los casos límite (`0`, vacío, `null`, `undefined`, extremos).
- Toda la suite de tests existente sigue pasando sin regresiones ni cambios fuera de alcance.

## 2. Herramientas
- Runner de pruebas del proyecto (`npm test`, `pytest`, `go test`, `cargo test`) + `git diff`.

## 3. Evidencia producida
- Test de regresión añadido o ampliado en la suite del proyecto.
- `.agents/evidence/report.{md,json}` con la ejecución de la prueba de regresión y la suite completa en verde.

## 4. Errores típicos que busca el revisor
- Corregir el código sin dejar un test de regresión que falle con el bug anterior.
- Ejecutar solo el test feliz existente mientras fallan los bordes (`0%`, `100%`, `>100%`, `null`, `""`).
- Rehacer módulos no relacionados (`git diff` fuera del alcance del fallo).
- Debilitar o borrar aserciones previas para que las pruebas pasen artificialmente.
