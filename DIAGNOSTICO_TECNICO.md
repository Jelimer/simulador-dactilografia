# Diagnóstico Técnico Integral y Propuestas de Optimización
## Simulador de Dactilografía Judicial

**Fecha de Emisión:** 07 de Septiembre de 2026  
**Autor:** Project Orchestrator (`orchestrator_main`)  
**Base de Datos / Fuentes:** Auditorías cruzadas de Exploradores Especializados (`explorer_survey_1`, `explorer_survey_2`, `explorer_survey_3`)  
**Estado:** Diagnóstico consolidado y aprobado para ejecución modular  

---

## 1. Resumen Ejecutivo

La aplicación web **Simulador Dactilografía** es una herramienta de alta relevancia formativa y evaluativa para postulantes del Poder Judicial (orientada a las exigencias del Poder Judicial de Corrientes: 140 palabras en 5 minutos, régimen estricto de penalización y actas oficiales). 

Tras la auditoría integral realizada sobre los 4.502 líneas de `src/App.jsx`, componentes auxiliares, estilos en `src/index.css`, configuración de Vite, Tailwind, ESLint y funciones serverless en `api/tts.js`, se concluye que:
1. **La aplicación es funcional y compila exitosamente (`npm run build` con código 0)**, pero sufre de una arquitectura monolítica extrema que genera severos cuellos de botella en el hilo principal durante el tipeo tecla a tecla, fugas de memoria en audio y un riesgo inminente de colapso en `localStorage` ante textos o PDFs masivos.
2. **El análisis estático (`npm run lint`) falla con 35 incidencias (33 errores, 2 advertencias)** debido a discrepancias de entorno en Node.js para `api/tts.js`, accesos prematuros a funciones dentro de hooks de React y variables no utilizadas.
3. **Se identificó una vulnerabilidad crítica en la persistencia**: la lectura de `dactilografia_simulador_historial` en la línea 604 de `App.jsx` carece de `try/catch`. Cualquier dato corrupto provocará un crash irrecuperable de la pantalla del Simulador.
4. **En el Simulador no existe scroll automático ni seguimiento de cursor visual**: el postulante está forzado a retirar las manos del teclado para mover la barra de desplazamiento con el mouse en pleno examen contra reloj.

A continuación se detalla el inventario exhaustivo de cuellos de botella categorizado por severidad y el plan maestro de modularización y optimización.

---

## 2. Inventario Priorizado de Cuellos de Botella Técnicos

### Nivel P0 (Crítico — Estabilidad, Bloqueo de UI, Pérdida de Datos y Memoria)

| ID | Área | Ubicación Exacta | Diagnóstico Técnico | Impacto |
|---|---|---|---|---|
| **P0-1** | Arquitectura | `src/App.jsx` (4.502 líneas) | Monolito absoluto: 11 componentes React, utilidades de WebAudio, sintetizador TTS, algoritmos de coincidencia de palabras, constantes de lecciones y extracción de PDF en un único archivo. | Rompe Vite React Fast Refresh (HMR), infla el bundle inicial a 343 kB y genera deuda técnica insostenible. |
| **P0-2** | Persistencia | `src/App.jsx`: 604 | `simHistory` se inicializa con `JSON.parse(localStorage.getItem('dactilografia_simulador_historial'))` sin bloque `try/catch`. | Un solo byte corrupto o corte de escritura arroja `SyntaxError` y causa pantalla en blanco irreversible en el Simulador. |
| **P0-3** | Rendimiento | `src/App.jsx`: 3121–3135 | En `Entrenamiento`, en cada pulsación de tecla (`handleKeyDown`), se regenera el Virtual DOM completo mapeando miles de elementos `<span key={index}>` con animaciones pulsantes y transiciones. | Sobrecarga extrema del hilo principal, latencia de entrada de teclado (keystroke lag) y caídas de FPS a <15 en textos largos. |
| **P0-4** | Memoria | `src/App.jsx`: 3636–3637 | Se invoca `URL.createObjectURL(blob)` para audios MP3 en `PreparacionTeorica` sin llamar jamás a `URL.revokeObjectURL`. | Fuga progresiva de memoria RAM por cada audio generado, reteniendo megabytes en el heap hasta cerrar la pestaña. |
| **P0-5** | Ingesta PDF | `src/App.jsx`: 3235–3249, 3296–3355 | Dependencia externa no empaquetada de `pdf.js` vía CDN Cloudflare inyectada dinámicamente en el DOM. Parseo síncrono secuencial de páginas en el hilo principal sin Web Worker. | Falla total en entornos offline o intranets judiciales; congelamiento total del navegador en PDFs de >20 páginas. |
| **P0-6** | Servidor TTS | `api/tts.js`: 85–106 | En textos de estudio (hasta 15.000 caracteres), la función serverless ejecuta un bucle secuencial de hasta 83 llamadas HTTP a Google Translate. | Tiempos de ejecución >16 segundos que superan el límite de 10s de Vercel Hobby, resultando en HTTP 504 Gateway Timeout y bloqueos por rate limiting 429. |
| **P0-7** | Almacenamiento | `src/App.jsx`: 3407–3411 | Guardado de textos HTML íntegros de PDFs (hasta 100k caracteres por nota) en `dactilografia_teoria_historial` sobre `localStorage` (límite 5MB). | Disparo de `QuotaExceededError` capturado en catch vacío; el usuario cree haber guardado su apunte pero se descarta silenciosamente. |

---

### Nivel P1 (Alto — Experiencia de Tipeo, Concurrencia y Sincronización)

| ID | Área | Ubicación Exacta | Diagnóstico Técnico | Impacto |
|---|---|---|---|---|
| **P1-1** | UX Examen | `src/App.jsx`: 944–963 | El texto de referencia en `Simulador` tiene `max-h-48 overflow-y-auto` estático sin auto-scroll ni cursor sincronizado con el avance de palabras. | El postulante debe soltar el teclado y usar el mouse en pleno examen para leer el resto del texto, perdiendo segundos vitales. |
| **P1-2** | Renderizado | `src/App.jsx`: 1144–1212, 2199–2448 | Componentes de teclado virtual (`KeyboardLayout`), manos (`HandsGuide`) y gráficos interactivos SVG carecen de `React.memo`. | Se re-renderizan por completo en cada caracter tipeado aunque la tecla activa o los dedos no hayan variado. |
| **P1-3** | Reactividad | `src/App.jsx`: 614–616 | `candidateName` en `Simulador` se memoriza con `useMemo(..., [])` vacío desde `localStorage`. | Si el usuario edita su nombre en `UserBar`, el Simulador retiene el nombre anterior durante toda la sesión. |
| **P1-4** | Audio TTS | `src/App.jsx`: 3679–3689, 3503–3512 | Al pausar la voz nativa del navegador se ejecuta `speechSynthesis.cancel()`, y al reanudar se fuerza `currentChunkIdx = 0`. | Imposible pausar y continuar: la lectura siempre se reinicia desde el primer párrafo. |
| **P1-5** | Calidad / Linter | `src/App.jsx`: 631, 3429, 2532 | Invocación de funciones en `useEffect` antes de ser declaradas en el cuerpo del componente y llamadas a `setState` síncronas en efectos. | Fallo en ESLint (33 errores), violación de reglas de hooks de React y riesgo de bucles de re-renderizado. |
| **P1-6** | Gráficos PDF | `src/App.jsx`: 3745–3775 | Invocación concurrente de `page.render()` sobre el canvas sin cancelar la tarea previa (`renderTask.cancel()`). | Excepción en consola: `Cannot use the same canvas during multiple render() operations`. |
| **P1-7** | Timers | `src/App.jsx`: 71–214 | Array `timeouts` en `createAmbientTyping` acumula identificadores sin podar los ya ejecutados. | Fuga leve de identificadores y memoria en sesiones de práctica prolongadas. |

---

### Nivel P2 (Medio — Accesibilidad, CSS y Extensibilidad)

| ID | Área | Ubicación Exacta | Diagnóstico Técnico | Impacto |
|---|---|---|---|---|
| **P2-1** | Accesibilidad | `src/App.jsx`: 949, 1144, 3037 | Áreas de tipeo sin `role="textbox"` ni `aria-label`, falta de regiones `aria-live` para cronómetro y velocímetro, y SVGs decorativos sin `aria-hidden`. | Inaccesibilidad severa para postulantes con discapacidad visual o usuarios de lectores de pantalla. |
| **P2-2** | Estilos CSS | `src/index.css`: 1–380 | Más de 40 directivas `!important` bajo `.premium-redesign` para forzar tema oscuro sobre clases fijas de Tailwind. Import de fuentes en CSS bloqueando el FCP. | Fragilidad en el diseño y penalización de ~150-250ms en la velocidad de renderizado de la primera pantalla. |
| **P2-3** | Ingesta | `src/App.jsx`: 3929 | Solo se admite formato `.pdf` mediante selector de archivo estricto. | Falta de soporte para archivos de texto plano (.txt, .md) y ausencia de funcionalidad de arrastrar y soltar (Drag & Drop). |
| **P2-4** | Replay Crash | `src/App.jsx`: 3201 | `replayData.text.split('')` se invoca sin validar si `text` es nulo o indefinido en lecciones dinámicas previas. | `TypeError` que congela la interfaz del módulo de entrenamiento. |

---

## 3. Mapeo y Garantía de Retrocompatibilidad de LocalStorage

Para dar cumplimiento irrestricto al requerimiento **R3**, se auditaron y preservaron todas las claves existentes en la aplicación:

1. **`dactilografia_userName`**: String con el nombre del postulante (fallback: `'POSTULANTE_001'`).
2. **`dactilografia_theme`**: String `'dark'` o `'light'` (fallback: `'dark'`).
3. **`dactilografia_custom_legal_texts`** y alias **`dactilografia_custom_texts`**: Array de objetos de textos personalizados (`id`, `title`, `content`, `isCustom`). El nuevo servicio de persistencia leerá ambas claves y mantendrá compatibilidad bidireccional.
4. **`dactilografia_simulador_historial`**: Array de intentos judiciales (`SimAttempt`). Se incorporará sanitización automática y blindaje con `try/catch`.
5. **`dactilografia_historial`**: Array de lecciones del curso de mecanografía (`TrainingAttempt`). Se normalizarán campos opcionales (`errorIndices`, `text`).
6. **`dactilografia_teoria_historial`**: Array de apuntes y fallos judiciales (`TheoryNote`).

### Servicio Unificado de Almacenamiento (`storageService.js`):
- Operaciones `safeGet(key, fallback)` y `safeSet(key, value)` con control de cuota.
- Migración transparente en arranque: unificación de claves de textos y normalización de registros históricos sin mutación destructiva.
- Fallback en memoria en caso de bloqueo de cookies o modo incógnito restrictivo.

---

## 4. Plan de Acción y Arquitectura Modular Propuesta

Se propone desacoplar el monolito de `App.jsx` en una estructura modular por dominios de negocio:

```
src/
├── components/
│   ├── common/             # Header.jsx, UserBar.jsx
│   ├── keyboard/           # KeyboardLayout.jsx, HandsGuide.jsx, HandsInteractive.jsx (con React.memo)
│   └── charts/             # EvolutionCharts.jsx
├── modules/
│   ├── simulator/          # Simulador.jsx, TypingArea.jsx (con auto-scroll), Results.jsx, ActaModal.jsx
│   ├── training/           # Entrenamiento.jsx, TypingView.jsx (con ventana deslizante), Replay.jsx
│   └── theory/             # PreparacionTeorica.jsx, AudioPlayer.jsx (TTS resumable), PdfExtractor.jsx
├── services/
│   ├── storage/            # storageService.js (retrocompatible y seguro)
│   ├── audio/              # typingAudio.js, ambientAudio.js, ttsService.js
│   ├── pdf/                # pdfService.js (carga diferida y cancelación de render)
│   └── evaluation/         # typingEvaluator.js (algoritmo judicial oficial)
├── constants/              # legalTexts.js, trainingLessons.js
└── App.jsx                 # Controlador raíz liviano (~70 líneas)
```

---

## 5. Criterios de Validación Técnica

1. **Build Limpio:** `npm run build` genera bundle sin errores y con código de salida 0.
2. **Lint Limpio:** `npm run lint` pasa con 0 errores mediante la configuración de Node en `api/tts.js` y ordenamiento de hooks.
3. **Persistencia Intacta:** Carga de historiales existentes sin pérdida de un solo intento ni alteración de esquemas.
4. **Rendimiento de Tipeo:** Supresión de keystroke lag mediante `React.memo` y ventana de renderizado acotada.
5. **Auto-Scroll Activo:** Escritura fluida en el Simulador sin necesidad de intervención manual con mouse.
