/**
 * Suite de Pruebas Automatizadas: Rediseño Premium de EvolutionCharts
 * Verifica en profundidad:
 * - R1: Anti-solapamiento y legibilidad estricta en Eje X (muestreo adaptativo y etiquetas concisas #1, #2...)
 * - R2: Calidad visual, curvas Bézier continuas (cubic splines) y lollipop con semáforo cromático (≥95%, 90-94%, <90%)
 * - R3: Panel de resumen estadístico (PPM Promedio, Récord, Precisión Promedio, Total) y formateo de tooltips
 * - R4: Inmunidad ante colecciones hostiles y preservación estricta de datos históricos
 * - R5: Renderizado y ciclo de vida de EvolutionCharts (SSR vía Vite, accesibilidad ARIA y anti-colisión vertical)
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
    formatDur, 
    formatFullTimestamp, 
    computeEvolutionSummary, 
    getVisibleLabelIndices, 
    getCubicBezierPath, 
    getPrecisionColor,
    parseMetric,
    safeMin,
    safeMax
} from '../../src/components/evolutionChartsUtils.js';
import storageService from '../../src/services/storage/storageService.js';
import { MockStorage } from '../helpers/mockStorage.js';

describe('Tier 1 - Rediseño Premium de EvolutionCharts', () => {

    beforeEach(() => {
        global.localStorage = new MockStorage();
    });

    describe('R1. Solución Definitiva de Solapamiento y Legibilidad en Eje X', () => {
        test('1.1 Manejo de colecciones vacías o no numéricas en getVisibleLabelIndices', () => {
            assert.deepEqual(getVisibleLabelIndices(0), []);
            assert.deepEqual(getVisibleLabelIndices(-5), []);
            assert.deepEqual(getVisibleLabelIndices(null), []);
            assert.deepEqual(getVisibleLabelIndices(undefined), []);
        });

        test('1.2 Colecciones pequeñas (<= 10 intentos) muestran todas las etiquetas concisas sin omisión', () => {
            const single = getVisibleLabelIndices(1, 10);
            assert.deepEqual(single, [0], 'Para 1 intento debe mostrar índice 0 (#1)');

            const five = getVisibleLabelIndices(5, 10);
            assert.deepEqual(five, [0, 1, 2, 3, 4], 'Para 5 intentos debe mostrar todos los índices concisos');

            const ten = getVisibleLabelIndices(10, 10);
            assert.deepEqual(ten, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'Para 10 intentos debe mostrar todos los índices');
        });

        test('1.3 Colecciones densas (>10 intentos) aplican paso dinámico sin colisiones físicas', () => {
            const testCounts = [11, 12, 14, 15, 16, 18, 20, 23, 25, 26, 29, 40, 60, 100];
            for (const count of testCounts) {
                const visible = getVisibleLabelIndices(count, 10);
                assert.ok(visible.length <= 11, `No debe superar ~10-11 etiquetas visibles (recibido: ${visible.length} para N=${count})`);
                assert.equal(visible[0], 0, 'El primer intento (#1) siempre debe estar presente');
                assert.equal(visible[visible.length - 1], count - 1, `El último intento (#${count}) siempre debe estar presente`);
                
                // Verificar que los índices sean estrictamente ascendentes y sin colisión adyacente (diff >= 2)
                for (let i = 0; i < visible.length - 1; i++) {
                    const diff = visible[i + 1] - visible[i];
                    assert.ok(diff >= 2, `Las etiquetas contiguas en colecciones densas deben tener separación mínima de 2 (N=${count}, índices ${visible[i]} y ${visible[i+1]})`);
                }
            }
        });

        test('1.4 Muestreo exhaustivo de anti-solapamiento para N de 1 a 200', () => {
            for (let count = 1; count <= 200; count++) {
                const visible = getVisibleLabelIndices(count, 10);
                assert.equal(visible[0], 0, `N=${count}: El primer índice debe ser 0`);
                assert.equal(visible[visible.length - 1], count - 1, `N=${count}: El último índice debe ser ${count - 1}`);
                if (count > 10) {
                    for (let i = 0; i < visible.length - 1; i++) {
                        assert.ok(visible[i + 1] - visible[i] >= 2, `N=${count}: Colisión adyacente detectada entre ${visible[i]} y ${visible[i+1]}`);
                    }
                }
            }
        });

        test('1.5 Formateo completo y resiliente de marcas temporales para el tooltip interactivo', () => {
            // Timestamp ISO estándar
            const isoAtt = { timestamp: '2026-09-08T13:30:00Z' };
            const formattedIso = formatFullTimestamp(isoAtt);
            assert.ok(formattedIso.length > 5, 'Debe formatear fecha y hora completa');

            // Timestamp numérico Date.now() / epoch
            const epochAtt = { timestamp: 1725800000000 };
            const formattedEpoch = formatFullTimestamp(epochAtt);
            assert.ok(formattedEpoch.length > 5, 'Debe formatear timestamp numérico epoch');
            assert.ok(!formattedEpoch.includes('no disponible'), 'No debe devolver fecha no disponible ante epoch válido');

            // Timestamp epoch como string de dígitos
            const epochStrAtt = { timestamp: '1725800000000' };
            const formattedEpochStr = formatFullTimestamp(epochStrAtt);
            assert.ok(formattedEpochStr.length > 5, 'Debe formatear string epoch numérico');

            // Campo alternativo createdAt o date
            assert.ok(formatFullTimestamp({ createdAt: '2026-09-08T10:00:00Z' }).length > 5);
            assert.ok(formatFullTimestamp({ date: '2026-09-08T10:00:00Z' }).length > 5);

            // Timestamp legible en español
            const textAtt = { timestamp: '08/09/2026, 10:30:00' };
            assert.equal(formatFullTimestamp(textAtt), '08/09/2026, 10:30:00');

            // Formato de entrenamiento de la app con guión (ej: "10:45 - 8 sept")
            const trainingAtt = { timestamp: '10:45 - 8 sept' };
            assert.equal(formatFullTimestamp(trainingAtt), '10:45 - 8 sept');

            // Fecha y hora separadas
            const splitAtt = { date: '08/09/2026', time: '11:15' };
            assert.equal(formatFullTimestamp(splitAtt), '08/09/2026 11:15');

            // Fallback a timeOnly
            const timeOnlyAtt = { timeOnly: '10:45' };
            assert.equal(formatFullTimestamp(timeOnlyAtt), 'Hora: 10:45');

            // Objeto vacío o nulo
            assert.equal(formatFullTimestamp({}), 'Fecha no disponible');
            assert.equal(formatFullTimestamp(null), 'Fecha no registrada');
        });

        test('1.6 Protección estricta contra bucles infinitos y RangeError en getVisibleLabelIndices con maxLabels <= 0 o null', () => {
            // maxLabels = 0, null o negativo antes provocaba bucle infinito y RangeError: Invalid array length
            assert.doesNotThrow(() => {
                const res0 = getVisibleLabelIndices(20, 0);
                assert.ok(Array.isArray(res0));
                assert.deepEqual(res0, [0, 19]);

                const resNull = getVisibleLabelIndices(20, null);
                assert.ok(Array.isArray(resNull));
                assert.deepEqual(resNull, [0, 19]);

                const resNeg = getVisibleLabelIndices(20, -5);
                assert.ok(Array.isArray(resNeg));
                assert.deepEqual(resNeg, [0, 19]);

                const res1 = getVisibleLabelIndices(20, 1);
                assert.ok(Array.isArray(res1));
                assert.deepEqual(res1, [0, 19]);
            }, 'No debe arrojar RangeError ni entrar en bucle infinito');
        });
    });

    describe('R2. Calidad Visual, Curvas Bézier Suaves y Código Cromático Lollipop', () => {
        test('2.1 getCubicBezierPath genera curvas suaves continuas libres de quiebres', () => {
            // Vacío
            assert.equal(getCubicBezierPath([]), '');
            assert.equal(getCubicBezierPath(null), '');

            // 1 punto (M)
            const p1 = [{ x: 50, y: 100 }];
            assert.equal(getCubicBezierPath(p1), 'M 50.0,100.0');

            // 2 puntos (M ... L)
            const p2 = [{ x: 50, y: 100 }, { x: 150, y: 80 }];
            assert.equal(getCubicBezierPath(p2), 'M 50.0,100.0 L 150.0,80.0');

            // 3 o más puntos (M ... C cp1 cp2 target ...)
            const pMulti = [
                { x: 40, y: 200 },
                { x: 100, y: 150 },
                { x: 180, y: 120 },
                { x: 260, y: 90 }
            ];
            const curve = getCubicBezierPath(pMulti, 0.25);
            assert.ok(curve.startsWith('M 40.0,200.0'), 'Debe iniciar con el comando M en el primer punto');
            assert.ok(curve.includes(' C '), 'Debe contener comandos Bézier cúbicos C');
            assert.ok(!curve.includes('NaN'), 'No debe generar valores NaN');
            assert.ok(!curve.includes('Infinity'), 'No debe generar valores infinitos');

            // Verificar que los segmentos coincidan con el número de puntos menos 1
            const cubicSegments = curve.split(' C ').length - 1;
            assert.equal(cubicSegments, pMulti.length - 1, 'Debe tener exactamente N-1 segmentos cúbicos');
        });

        test('2.2 getPrecisionColor aplica el semáforo cromático exigido y sincroniza con redondeo', () => {
            // ≥ 95%: Verde esmeralda (tier high)
            const p100 = getPrecisionColor(100);
            assert.equal(p100.tier, 'high');
            assert.equal(p100.fill, '#10b981');

            const p95 = getPrecisionColor(95);
            assert.equal(p95.tier, 'high');
            assert.equal(p95.fill, '#10b981');

            // 94.8% redondea a 95% -> tier high (verde), previniendo contradicción con el texto visual "95%"
            const p948 = getPrecisionColor(94.8);
            assert.equal(p948.tier, 'high');
            assert.equal(p948.fill, '#10b981');

            // 90 - 94%: Ámbar dorado (tier medium)
            const p94 = getPrecisionColor(94);
            assert.equal(p94.tier, 'medium');
            assert.equal(p94.fill, '#f59e0b');

            const p942 = getPrecisionColor(94.2);
            assert.equal(p942.tier, 'medium');
            assert.equal(p942.fill, '#f59e0b');

            const p90 = getPrecisionColor(90);
            assert.equal(p90.tier, 'medium');
            assert.equal(p90.fill, '#f59e0b');

            // 89.6% redondea a 90% -> tier medium (ámbar), coherente con el texto "90%"
            const p896 = getPrecisionColor(89.6);
            assert.equal(p896.tier, 'medium');
            assert.equal(p896.fill, '#f59e0b');

            // < 90%: Coral / Rosa intenso (tier low)
            const p89 = getPrecisionColor(89);
            assert.equal(p89.tier, 'low');
            assert.equal(p89.fill, '#f43f5e');

            const p892 = getPrecisionColor(89.2);
            assert.equal(p892.tier, 'low');
            assert.equal(p892.fill, '#f43f5e');

            const p0 = getPrecisionColor(0);
            assert.equal(p0.tier, 'low');
            assert.equal(p0.fill, '#f43f5e');
        });

        test('2.3 Resiliencia cromática y parseo de métricas con unidades string ("98%", "50 PPM", "95,5%")', () => {
            // getPrecisionColor con strings formateadas
            assert.equal(getPrecisionColor('98%').tier, 'high');
            assert.equal(getPrecisionColor('95%').tier, 'high');
            assert.equal(getPrecisionColor('92%').tier, 'medium');
            assert.equal(getPrecisionColor('85%').tier, 'low');
            assert.equal(getPrecisionColor('94,8%').tier, 'high');

            // parseMetric
            assert.equal(parseMetric('60 PPM'), 60);
            assert.equal(parseMetric('95%'), 95);
            assert.equal(parseMetric('95,5%'), 95.5);
            assert.equal(parseMetric(120), 120);
            assert.equal(parseMetric(null, 10), 10);
            assert.equal(parseMetric(undefined, 0), 0);
        });
    });

    describe('R3. Métricas de Resumen Estadístico y Formato de Duración', () => {
        test('3.1 computeEvolutionSummary calcula métricas agregadas correctas', () => {
            const attempts = [
                { wpm: 40, precision: 90, duration: 60 },
                { wpm: 60, precision: 100, duration: 45 },
                { wpm: 50, precision: 95, duration: 55 }
            ];

            const summary = computeEvolutionSummary(attempts);
            assert.equal(summary.totalPractices, 3);
            assert.equal(summary.avgWpm, 50, 'Promedio de (40+60+50)/3 = 50');
            assert.equal(summary.maxWpm, 60, 'Máximo WPM récord debe ser 60');
            assert.equal(summary.avgPrecision, 95, 'Promedio de (90+100+95)/3 = 95');
        });

        test('3.2 computeEvolutionSummary degrada limpiamente ante colecciones vacías o corruptas', () => {
            const emptySummary = computeEvolutionSummary([]);
            assert.deepEqual(emptySummary, {
                totalPractices: 0,
                avgWpm: 0,
                maxWpm: 0,
                avgPrecision: 0
            });

            const hostileSummary = computeEvolutionSummary([null, undefined, 'no-valido', 42]);
            assert.deepEqual(hostileSummary, {
                totalPractices: 0,
                avgWpm: 0,
                maxWpm: 0,
                avgPrecision: 0
            });
        });

        test('3.3 computeEvolutionSummary soporta colecciones masivas (10.000 intentos) sin desbordamiento de pila', () => {
            const massive = Array.from({ length: 10000 }, (_, i) => ({
                wpm: 50 + (i % 30),
                precision: 90 + (i % 10),
                duration: 60
            }));

            assert.doesNotThrow(() => {
                const sum = computeEvolutionSummary(massive);
                assert.equal(sum.totalPractices, 10000);
                assert.ok(sum.maxWpm >= 79);
            }, 'No debe arrojar RangeError: Maximum call stack size exceeded');
        });

        test('3.4 formatDur formatea segundos en minutos y segundos consistentes y soporta preformateados', () => {
            assert.equal(formatDur(0), '0:00');
            assert.equal(formatDur(5), '0:05');
            assert.equal(formatDur(59), '0:59');
            assert.equal(formatDur(60), '1:00');
            assert.equal(formatDur(75), '1:15');
            assert.equal(formatDur(3600), '60:00');
            assert.equal(formatDur(-10), '0:00');
            assert.equal(formatDur(null), '0:00');
            assert.equal(formatDur('1:45'), '1:45');
            assert.equal(formatDur('90s'), '1:30');
        });

        test('3.5 safeMin y safeMax no sufren desbordamiento de pila en arreglos masivos (200.000 elementos)', () => {
            const massive = new Array(200000).fill(50);
            massive[100] = 120;
            massive[500] = 5;

            assert.doesNotThrow(() => {
                const max = safeMax(massive, 0);
                assert.equal(max, 120);

                const min = safeMin(massive, 100);
                assert.equal(min, 5);
            }, 'safeMax y safeMin deben resistir 200.000 elementos sin RangeError');
        });
    });

    describe('R4. Inmutabilidad de Datos y Preservación Estricta de Historiales', () => {
        test('4.1 Las funciones de EvolutionCharts nunca mutan los objetos del historial', () => {
            const originalAttempt = Object.freeze({
                id: 1,
                wpm: 55,
                precision: 98,
                duration: 60,
                timestamp: '2026-09-08 11:00:00'
            });

            assert.doesNotThrow(() => {
                computeEvolutionSummary([originalAttempt]);
                formatFullTimestamp(originalAttempt);
                getPrecisionColor(originalAttempt.precision);
            }, 'No debe arrojar error de mutación sobre objetos congelados');
        });

        test('4.2 Persistencia intacta de dactilografia_historial y dactilografia_simulador_historial', () => {
            // Guardar datos en storage simulado
            storageService.saveSimAttempt({
                candidateName: 'Postulante Judicial Prueba',
                wpm: 145,
                timeSpentMinutes: 5,
                passed: true,
                requiredWords: 140,
                totalWords: 725
            });

            storageService.saveTrainingAttempt({
                lessonId: 1,
                wpm: 55,
                precision: 98,
                duration: 60
            });

            const simHist = storageService.getSimHistory();
            const trainHist = storageService.getTrainingHistory();

            assert.equal(simHist.length, 1);
            assert.equal(trainHist.length, 1);
            assert.equal(simHist[0].candidateName, 'Postulante Judicial Prueba');
            assert.equal(trainHist[0].wpm, 55);
        });
    });

    describe('R5. Componente React EvolutionCharts (Renderizado SSR vía Vite)', () => {
        test('5.1 EvolutionCharts renderiza correctamente con intentos válidos y retorna null ante vacíos', async () => {
            const { createServer } = await import('vite');
            const server = await createServer({ server: { middlewareMode: true } });
            try {
                const mod = await server.ssrLoadModule('./src/components/EvolutionCharts.jsx');
                const EvolutionCharts = mod.default;

                const React = await import('react');
                const { renderToString } = await import('react-dom/server');

                // 1. Colección vacía: debe retornar HTML vacío
                const emptyHtml = renderToString(React.createElement(EvolutionCharts, { filteredAttempts: [] }));
                assert.equal(emptyHtml, '', 'Colección vacía debe retornar HTML vacío');

                // 2. Colección con datos: debe renderizar HTML completo con las secciones
                const validAttempts = [
                    { id: '1', lessonId: 1, lessonTitle: 'Lección 1', wpm: 45, precision: 92, duration: 60, timestamp: '2026-09-08 10:00:00' },
                    { id: '2', lessonId: 1, lessonTitle: 'Lección 1', wpm: 58, precision: 96, duration: 50, timestamp: '2026-09-08 10:15:00' }
                ];
                const html = renderToString(React.createElement(EvolutionCharts, { filteredAttempts: validAttempts, theme: 'dark' }));
                assert.ok(html.length > 100, 'Debe renderizar HTML ante intentos válidos');
                assert.ok(html.includes('Velocidad PPM'), 'Debe contener sección de Velocidad');
                assert.ok(html.includes('Precisión %'), 'Debe contener sección de Precisión');
                assert.ok(html.includes('Velocidad y Precisión Combinadas'), 'Debe contener gráfico combinado');
                assert.ok(html.includes('PPM Promedio'), 'Debe contener métrica de PPM Promedio en resumen');
                assert.ok(html.includes('PPM Máximo (Récord)'), 'Debe contener métrica de PPM Máximo en resumen');
                assert.ok(html.includes('Precisión Promedio'), 'Debe contener métrica de Precisión Promedio en resumen');

                // Verificar accesibilidad: solo se permite motion-safe:animate-pulse
                const fs = await import('node:fs');
                const chartCode = fs.readFileSync('./src/components/EvolutionCharts.jsx', 'utf8');
                assert.ok(chartCode.includes('motion-safe:animate-pulse'), 'Debe utilizar clases motion-safe para accesibilidad');
                assert.ok(!chartCode.includes(' animate-pulse"'), 'No debe contener animate-pulse sin motion-safe');
            } finally {
                await server.close();
            }
        });

        test('5.2 Caso borde N = 1: renderiza centrado sin NaN ni división por cero', async () => {
            const { createServer } = await import('vite');
            const server = await createServer({ server: { middlewareMode: true } });
            try {
                const mod = await server.ssrLoadModule('./src/components/EvolutionCharts.jsx');
                const EvolutionCharts = mod.default;
                const React = await import('react');
                const { renderToString } = await import('react-dom/server');

                const singleAttempt = [
                    { id: '1', lessonId: 1, lessonTitle: 'Lección Inicial', wpm: 50, precision: 95, duration: 60, timestamp: Date.now() }
                ];

                const html = renderToString(React.createElement(EvolutionCharts, { filteredAttempts: singleAttempt, theme: 'light' }));
                assert.ok(!html.includes('NaN'), 'El HTML para N=1 no debe contener valores NaN');
                assert.ok(!html.includes('Infinity'), 'El HTML para N=1 no debe contener valores Infinity');
                assert.ok(html.includes('#1'), 'Debe renderizar la etiqueta #1 en el eje X');
            } finally {
                await server.close();
            }
        });

        test('5.3 Caso borde densos N = 60: renderiza barras y lollipops sin superposición física ni colisión', async () => {
            const { createServer } = await import('vite');
            const server = await createServer({ server: { middlewareMode: true } });
            try {
                const mod = await server.ssrLoadModule('./src/components/EvolutionCharts.jsx');
                const EvolutionCharts = mod.default;
                const React = await import('react');
                const { renderToString } = await import('react-dom/server');

                const denseAttempts = Array.from({ length: 60 }, (_, i) => ({
                    id: String(i + 1),
                    lessonId: (i % 10) + 1,
                    wpm: 40 + (i % 30),
                    precision: 88 + (i % 12),
                    duration: 45 + (i % 20),
                    timestamp: 1725800000000 + i * 60000
                }));

                const html = renderToString(React.createElement(EvolutionCharts, { filteredAttempts: denseAttempts, theme: 'dark' }));
                assert.ok(!html.includes('NaN'), 'El HTML para N=60 no debe contener valores NaN');
                assert.ok(html.includes('Total de Prácticas'), 'Debe renderizar panel de resumen');
                assert.ok(html.includes('60'), 'Debe mostrar 60 sesiones en el resumen');
            } finally {
                await server.close();
            }
        });

        test('5.4 Anti-colisión estricta en CombinedChart cerca del fondo: métricas nunca solapan las etiquetas del eje X', async () => {
            const { createServer } = await import('vite');
            const server = await createServer({ server: { middlewareMode: true } });
            try {
                const mod = await server.ssrLoadModule('./src/components/EvolutionCharts.jsx');
                const EvolutionCharts = mod.default;
                const React = await import('react');
                const { renderToString } = await import('react-dom/server');

                // Intentos con valores mínimos donde los puntos quedan junto al fondo yBase (280)
                const lowAttempts = [
                    { id: '1', wpm: 0, precision: 0, duration: 60, timestamp: '2026-09-08' },
                    { id: '2', wpm: 0, precision: 0, duration: 60, timestamp: '2026-09-08' }
                ];

                const html = renderToString(React.createElement(EvolutionCharts, { filteredAttempts: lowAttempts, theme: 'light' }));
                assert.ok(!html.includes('NaN'), 'No debe contener NaN');

                // En CombinedChart yBase es 280, la etiqueta del eje X está en yBase + 17 = 297.
                // Ninguna etiqueta de métrica numérica debe ubicarse en y = 296 o 297.
                const matches = [...html.matchAll(/<text[^>]*y="([^"]+)"[^>]*>([^<]+)<\/text>/g)];
                for (const m of matches) {
                    const yVal = parseFloat(m[1]);
                    const textContent = m[2].trim();
                    if (textContent === '0' || textContent === '0%') {
                        // La métrica debe estar apilada arriba del punto, nunca a nivel del eje X
                        assert.ok(yVal < 285, `La métrica ${textContent} en y=${yVal} no debe invadir el eje X (y=297)`);
                    }
                }
            } finally {
                await server.close();
            }
        });

        test('5.5 Accesibilidad semántica SVG y navegación por teclado en los 3 gráficos', async () => {
            const { createServer } = await import('vite');
            const server = await createServer({ server: { middlewareMode: true } });
            try {
                const mod = await server.ssrLoadModule('./src/components/EvolutionCharts.jsx');
                const EvolutionCharts = mod.default;
                const React = await import('react');
                const { renderToString } = await import('react-dom/server');

                const attempts = [
                    { id: '1', wpm: 45, precision: 92, duration: 60, timestamp: '2026-09-08' }
                ];

                const html = renderToString(React.createElement(EvolutionCharts, { filteredAttempts: attempts, theme: 'light' }));
                
                // Atributos semánticos para lectores de pantalla
                assert.ok(html.includes('role="img"'), 'Los gráficos SVG deben incluir role="img"');
                assert.ok(html.includes('aria-label="Gráfico de evolución de velocidad en PPM por sesión"'), 'Debe incluir aria-label descriptivo en SpeedChart');
                assert.ok(html.includes('aria-label="Gráfico de evolución de precisión porcentual"'), 'Debe incluir aria-label descriptivo en PrecisionChart');
                assert.ok(html.includes('aria-label="Gráfico combinado de evolución de velocidad y precisión con curvas suaves Bézier"'), 'Debe incluir aria-label en CombinedChart');

                // Navegabilidad por teclado
                assert.ok(html.includes('tabindex="0"'), 'Los elementos interactivos deben admitir foco de teclado tabIndex="0"');
                assert.ok(html.includes('role="button"'), 'Los elementos interactivos deben declararse con role="button"');
            } finally {
                await server.close();
            }
        });
    });
});
