# Receta: Aplicaciones con LLM y Agentes

## 1. Qué se comprueba
- Conjunto fijo de casos de evaluación (`eval/cases.json`) que cubra casos normales, bordes y entradas adversas (inyección de prompt, anulación de instrucciones).
- Comparación medible **antes vs. después** contra una línea base (`eval/baseline.json` -> `eval/report.json`), repitiendo `N` veces si hay variabilidad.
- Coste o tokens por petición medidos frente al presupuesto.
- Cumplimiento de esquema JSON de salida y manejo seguro si el modelo falla o responde vacío.

## 2. Herramientas
- Suite de evaluación del proyecto (`mtsk eval`, `vitest`, `node --test`, `pytest`, Promptfoo o script propio).

## 3. Evidencia producida
- Informe de evaluación (`eval/report.json`) con precisión inicial, precisión final, tasa en casos adversos y tokens/coste medio por petición.
- Suite de pruebas en verde registrada en `.agents/evidence/report.{md,json}`.

## 4. Errores típicos que busca el revisor
- Cambiar prompts "a ojo" sin medir antes y después sobre casos fijos.
- Pasar ejemplos felices pero caer ante inyecciones simples (*"Ignore previous instructions..."*).
- Hacer trampas ajustando solo a IDs o frases literales del fixture en lugar de aislar instrucciones del texto de usuario.
- Ocultar subidas fuertes de tokens, latencia o coste por añadir llamadas extra.
