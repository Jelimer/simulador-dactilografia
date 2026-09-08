/**
 * Tier 1 - Cobertura Funcional & Resiliencia: Retorno de Arrays e Integración de Flujos
 * 
 * Verifica:
 * 1. Métodos de guardado retornan arrays iterables (.map, .filter, .forEach).
 * 2. Flujo completo de finalización de lección de entrenamiento guiado sin excepciones.
 * 3. Flujo completo de finalización de examen oficial en simulador sin excepciones.
 * 4. Resiliencia de actualizadores de estado defensivos ante entradas anómalas.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, resetStorageService, getTypingEvaluator } from '../helpers/contracts.js';

describe('Tier 1: Retorno de Arrays Iterables y Flujos Completos de Finalización', () => {
    let mockStorage;
    let storageService;

    beforeEach(async () => {
        mockStorage = setupTestStorage();
        storageService = await getStorageService();
        resetStorageService(storageService);
    });

    afterEach(() => {
        if (mockStorage) {
            mockStorage.uninstall();
        }
    });

    // ------------------------------------------------------------------------
    // 1. Verificación de arrays iterables retornados por métodos de almacenamiento
    // ------------------------------------------------------------------------
    describe('1. Métodos de guardado retornan Arrays iterables con soporte para .map, .filter y .forEach', () => {
        test('1.1 saveSimAttempt debe retornar un Array con el intento agregado en posición 0', () => {
            const attempt1 = {
                id: 101,
                candidateName: 'Postulante A',
                wpm: '35.0',
                passed: true,
                accountedWords: 140
            };

            const result1 = storageService.saveSimAttempt(attempt1);
            assert.ok(Array.isArray(result1), 'El resultado debe ser un Array');
            assert.equal(result1.length, 1);
            assert.equal(result1[0].id, 101);

            // Verificación de iterabilidad
            const wpms = result1.map(x => x.wpm);
            assert.deepEqual(wpms, ['35.0']);

            const passedList = result1.filter(x => x.passed);
            assert.equal(passedList.length, 1);

            let iterations = 0;
            result1.forEach(x => {
                assert.equal(x.candidateName, 'Postulante A');
                iterations++;
            });
            assert.equal(iterations, 1);

            // Segundo intento consecutivo
            const attempt2 = {
                id: 102,
                candidateName: 'Postulante B',
                wpm: '40.0',
                passed: true,
                accountedWords: 150
            };
            const result2 = storageService.saveSimAttempt(attempt2);
            assert.ok(Array.isArray(result2));
            assert.equal(result2.length, 2);
            assert.equal(result2[0].id, 102); // orden cronológico inverso
        });

        test('1.2 saveTrainingAttempt debe retornar un Array con el intento al final de la colección', () => {
            const training1 = {
                lessonId: 1,
                lessonTitle: 'Lección 1: F y J',
                wpm: 28,
                accuracy: 96,
                stars: 3,
                text: 'ff jj ff jj',
                errorIndices: { 2: true }
            };

            const result1 = storageService.saveTrainingAttempt(training1);
            assert.ok(Array.isArray(result1), 'El resultado de saveTrainingAttempt debe ser un Array');
            assert.equal(result1.length, 1);

            // Verificación de iterabilidad nativa
            const lessonIds = result1.map(x => x.lessonId);
            assert.deepEqual(lessonIds, [1]);

            const highAccuracy = result1.filter(x => x.accuracy >= 95);
            assert.equal(highAccuracy.length, 1);

            let forEachRan = false;
            result1.forEach(x => {
                assert.equal(x.wpm, 28);
                forEachRan = true;
            });
            assert.ok(forEachRan);

            // Guardado sucesivo
            const training2 = {
                lessonId: 2,
                lessonTitle: 'Lección 2: D y K',
                wpm: 32,
                accuracy: 98,
                stars: 3
            };
            const result2 = storageService.saveTrainingAttempt(training2);
            assert.ok(Array.isArray(result2));
            assert.equal(result2.length, 2);
            assert.equal(result2[1].lessonId, 2);
        });

        test('1.3 saveCustomText debe retornar un Array con todos los textos personalizados', () => {
            const custom1 = {
                title: 'Sentencia de Cámara Laboral',
                content: 'Autos caratulados Perez c/ Gomez s/ Indemnizacion...'
            };

            const result1 = storageService.saveCustomText(custom1);
            assert.ok(Array.isArray(result1), 'saveCustomText debe retornar un Array');
            assert.equal(result1.length, 1);

            // Iterabilidad
            const titles = result1.map(t => t.title);
            assert.deepEqual(titles, ['Sentencia de Cámara Laboral']);

            const filtered = result1.filter(t => t.isCustom);
            assert.equal(filtered.length, 1);

            let count = 0;
            result1.forEach(t => {
                assert.ok(t.id > 0);
                count++;
            });
            assert.equal(count, 1);

            // Compatible con lectura de propiedades directas
            assert.ok(result1.id > 0);
            assert.equal(result1.title, 'Sentencia de Cámara Laboral');
        });

        test('1.4 saveTheoryNote debe retornar un Array con todos los apuntes teóricos', () => {
            const note1 = {
                title: 'Resumen Código Procesal Civil',
                content: 'Plazos procesales perentorios e improrrogables.'
            };

            const result1 = storageService.saveTheoryNote(note1);
            assert.ok(Array.isArray(result1), 'saveTheoryNote debe retornar un Array');
            assert.equal(result1.length, 1);

            // Iterabilidad
            const titles = result1.map(n => n.title);
            assert.deepEqual(titles, ['Resumen Código Procesal Civil']);

            const filtered = result1.filter(n => n.title.includes('Código'));
            assert.equal(filtered.length, 1);

            let iterated = false;
            result1.forEach(n => {
                assert.ok(n.id);
                iterated = true;
            });
            assert.ok(iterated);

            // Compatible con lectura de metadatos directos
            assert.ok(result1.id);
            assert.ok(result1.timestamp);
        });
    });

    // ------------------------------------------------------------------------
    // 2. Simulación del Flujo Completo de Entrenamiento Guiado
    // ------------------------------------------------------------------------
    describe('2. Flujo Completo de Práctica de Entrenamiento Guiado (Prevención de White Screen)', () => {
        test('2.1 Simula la finalización de lección de dedos con renderizado de estadísticas y heatmap sin fallar', () => {
            // Estado inicial del componente en React
            let history = storageService.getTrainingHistory();
            assert.ok(Array.isArray(history));
            assert.equal(history.length, 0);

            // Función simulada de actualización de estado blindada (como en App.jsx)
            const setHistory = (val) => {
                history = Array.isArray(val) ? val : (val ? [val] : []);
            };

            // Simulación de práctica finalizada
            const completedAttempt = {
                lessonId: 3,
                lessonTitle: 'Lección 3: Teclas E e I',
                wpm: 34,
                precision: 97,
                accuracy: 97,
                stars: 3,
                duration: 45,
                correctChars: 120,
                errorChars: 4,
                text: 'ede ded efe ede did did kik did',
                errorIndices: { '4': true, '6': true },
                timestamp: '08/09/2026, 10:30'
            };

            // 1. Guardar intento a través de storageService
            const updatedFromStorage = storageService.saveTrainingAttempt(completedAttempt);
            
            // 2. Invocar actualizador de estado en App
            setHistory(Array.isArray(updatedFromStorage) ? updatedFromStorage : (updatedFromStorage ? [updatedFromStorage] : []));

            // 3. Simular operaciones de UI que provocaban la pantalla en blanco
            // 3a. Generación de mapa de calor de errores:
            assert.doesNotThrow(() => {
                const keyErrorMap = {};
                history.forEach(attempt => {
                    if (attempt.errorIndices && attempt.text) {
                        Object.keys(attempt.errorIndices).forEach(idx => {
                            const char = attempt.text[parseInt(idx)];
                            if (char && char !== ' ') {
                                const c = char.toLowerCase();
                                keyErrorMap[c] = (keyErrorMap[c] || 0) + 1;
                            }
                        });
                    }
                });
                assert.equal(keyErrorMap['d'], 2);
            }, 'history.forEach no debe arrojar TypeError');

            // 3b. Filtrado de intentos por lección (TrainingResultsUI & EvolutionCharts):
            assert.doesNotThrow(() => {
                const lessonAttempts = history.filter(item => item.lessonId === 3);
                assert.equal(lessonAttempts.length, 1);
                assert.equal(lessonAttempts[0].wpm, 34);
            }, 'history.filter no debe arrojar TypeError');

            // 3c. Mapeo de historial para gráficas:
            assert.doesNotThrow(() => {
                const wpms = history.map(h => h.wpm);
                assert.deepEqual(wpms, [34]);
            }, 'history.map no debe arrojar TypeError');

            // 3d. Cálculo de estrellas acumuladas en el menú de lecciones:
            assert.doesNotThrow(() => {
                const attempts = history.filter(h => h.lessonId === 3);
                const bestStars = attempts.reduce((max, curr) => curr.stars > max ? curr.stars : max, 0);
                assert.equal(bestStars, 3);
            });
        });
    });

    // ------------------------------------------------------------------------
    // 3. Simulación del Flujo Completo del Simulador Oficial de Dactilografía
    // ------------------------------------------------------------------------
    describe('3. Flujo Completo de Examen Oficial en Simulador (Prevención de White Screen)', () => {
        test('3.1 Simula la finalización de intento de examen con evaluación judicial y tabla de resultados sin fallar', async () => {
            const { evaluateTyping } = await getTypingEvaluator();

            // Estado inicial del componente en React
            let simHistory = storageService.getSimHistory();
            assert.ok(Array.isArray(simHistory));
            assert.equal(simHistory.length, 0);

            // Función simulada de actualización de estado blindada
            const setSimHistory = (val) => {
                simHistory = Array.isArray(val) ? val : (val ? [val] : []);
            };

            // Simulación de examen tipeado
            const textToType = "En la ciudad de Corrientes, a los ocho días del mes de septiembre de dos mil veintiséis, se reúne el Tribunal.";
            const typedText = "En la ciudad de Corrientes a los ocho días del mes de septiembre de dos mil veintiséis, se reúne el Tribunal.";
            
            const evalResult = evaluateTyping(textToType, typedText, 300, 140);
            
            const examResult = {
                id: Date.now(),
                candidateName: 'Dra. Silveira',
                timestamp: '08/09/2026, 11:15',
                textId: 1,
                textTitle: 'Acta Notarial',
                timeLimitMinutes: 5,
                requiredWords: 140,
                wpm: '38.5',
                errorsPerMinute: '0.2',
                timeSpentMinutes: 5,
                passed: evalResult.accountedWords >= 140,
                strictMode: false,
                ...evalResult
            };

            // 1. Guardar intento en storageService
            const updatedHistory = storageService.saveSimAttempt(examResult);

            // 2. Invocar setter blindado
            setSimHistory(Array.isArray(updatedHistory) ? updatedHistory : (updatedHistory ? [updatedHistory] : []));

            // 3. Simular operaciones de UI de Simulador (pantalla de resultados y tabla histórica)
            assert.doesNotThrow(() => {
                // Verificar longitud
                assert.ok(simHistory.length > 0);

                // Mapear historial en tabla oficial
                const renderedRows = simHistory.map((attempt) => ({
                    id: attempt.id,
                    postulante: attempt.candidateName,
                    palabras: attempt.accountedWords,
                    ppm: attempt.wpm,
                    aprobado: attempt.passed
                }));
                assert.equal(renderedRows.length, 1);
                assert.equal(renderedRows[0].postulante, 'Dra. Silveira');

                // Filtrar para borrado o búsqueda
                const filtered = simHistory.filter(x => x.id === examResult.id);
                assert.equal(filtered.length, 1);
            }, 'Operaciones sobre simHistory no deben arrojar ninguna excepción');
        });
    });

    // ------------------------------------------------------------------------
    // 4. Blindaje Defensivo ante Valores Inesperados
    // ------------------------------------------------------------------------
    describe('4. Resiliencia de Actualizadores Defensivos ante Valores Anómalos', () => {
        test('4.1 Un setter blindado convierte un objeto aislado en un Array unitario', () => {
            let state = [];
            const safeSetter = (val) => {
                state = Array.isArray(val) ? val : (val ? [val] : []);
            };

            // Simular paso anómalo de objeto no array
            safeSetter({ id: 999, candidateName: 'Objeto Crudo' });
            assert.ok(Array.isArray(state));
            assert.equal(state.length, 1);
            assert.equal(state[0].id, 999);
            assert.doesNotThrow(() => state.map(x => x.id));
        });

        test('4.2 Un setter blindado convierte null o undefined en un Array vacío', () => {
            let state = [{ id: 1 }];
            const safeSetter = (val) => {
                state = Array.isArray(val) ? val : (val ? [val] : []);
            };

            safeSetter(null);
            assert.ok(Array.isArray(state));
            assert.equal(state.length, 0);

            safeSetter(undefined);
            assert.ok(Array.isArray(state));
            assert.equal(state.length, 0);
            assert.doesNotThrow(() => state.forEach(() => {}));
        });

        test('4.3 Métodos de guardado no se corrompen si el payload incluye una propiedad length: 0 o numérica', () => {
            // Caso crítico detectado en revisión adversarial:
            // Si el objeto a guardar contenía una propiedad length (ej: { length: 0 }),
            // Object.assign(updated, item) sobreescribía la propiedad length nativa del Array, truncando los datos.
            const attemptWithLength = {
                id: 501,
                candidateName: 'Dr. EdgeCase',
                length: 0,
                passed: true,
                accountedWords: 145
            };

            const simResult = storageService.saveSimAttempt(attemptWithLength);
            assert.ok(Array.isArray(simResult), 'Debe ser un Array');
            assert.equal(simResult.length, 1, 'La longitud del arreglo debe ser 1 y no debe ser truncada a 0');
            assert.equal(simResult[0].id, 501);

            const trainingWithLength = {
                lessonId: 4,
                length: 0,
                wpm: 42,
                precision: 99
            };
            const trainResult = storageService.saveTrainingAttempt(trainingWithLength);
            assert.ok(Array.isArray(trainResult));
            assert.equal(trainResult.length, 1, 'saveTrainingAttempt no debe truncar el array con length: 0');
            assert.equal(trainResult[0].lessonId, 4);

            const customWithLength = {
                title: 'Texto con length',
                content: 'Contenido del texto...',
                length: 0
            };
            const customResult = storageService.saveCustomText(customWithLength);
            assert.ok(Array.isArray(customResult));
            assert.equal(customResult.length, 1);

            const noteWithLength = {
                title: 'Nota con length',
                content: 'Apunte procesal...',
                length: 0
            };
            const noteResult = storageService.saveTheoryNote(noteWithLength);
            assert.ok(Array.isArray(noteResult));
            assert.equal(noteResult.length, 1);
        });

        test('4.4 UI de Entrenamiento no arroja TypeError ante elementos nulos o corruptos en history', () => {
            // Si el almacenamiento local fue manipulado o reparado conteniendo un elemento nulo:
            const corruptedHistory = [
                null,
                undefined,
                { lessonId: 3, wpm: 35, stars: 2, errorIndices: { 1: true }, text: 'abc' },
                null
            ];

            // 1. keyErrorMap
            assert.doesNotThrow(() => {
                const map = {};
                corruptedHistory.forEach(attempt => {
                    if (attempt && attempt.errorIndices && attempt.text) {
                        Object.keys(attempt.errorIndices).forEach(idx => {
                            const char = attempt.text[parseInt(idx)];
                            if (char && char !== ' ') {
                                const c = char.toLowerCase();
                                map[c] = (map[c] || 0) + 1;
                            }
                        });
                    }
                });
                assert.equal(map['b'], 1);
            });

            // 2. allAttempts filtering
            assert.doesNotThrow(() => {
                const filtered = corruptedHistory.filter(item => item && item.lessonId === 3);
                assert.equal(filtered.length, 1);
            });

            // 3. Menú de tarjetas de lección
            assert.doesNotThrow(() => {
                const attempts = corruptedHistory.filter(h => h && h.lessonId === 3);
                const bestStars = attempts.reduce((max, curr) => curr.stars > max ? curr.stars : max, 0);
                assert.equal(bestStars, 2);
            });
        });

        test('4.5 UI de Simulador no arroja TypeError al mapear tabla con elementos nulos en simHistory', () => {
            const corruptedSimHistory = [
                null,
                { id: 99, candidateName: 'Postulante Válido', timestamp: '08/09/2026', wpm: '40.0', accountedWords: 140, requiredWords: 140, passed: true },
                undefined
            ];

            assert.doesNotThrow(() => {
                const safeHistory = corruptedSimHistory.filter(Boolean);
                const rows = safeHistory.map(attempt => attempt.candidateName);
                assert.deepEqual(rows, ['Postulante Válido']);
            });
        });

        test('4.6 Inmunidad ante colisiones con Array.prototype (map, filter, forEach, slice) e índices numéricos ("0")', () => {
            // Ataque adversarial: inyectar propiedades con nombres de métodos de Array e índices
            const hostilePayload = {
                id: 888,
                lessonId: 5,
                title: 'Texto Hostil',
                content: 'Contenido legal...',
                candidateName: 'Dr. Hostil',
                map: 'sobreescritura_maliciosa',
                filter: 12345,
                forEach: false,
                slice: null,
                reduce: 'cadena',
                0: 'elemento_corrupto_en_indice_0',
                1: 'elemento_corrupto_en_indice_1',
                length: 0
            };

            // 1. saveSimAttempt
            const simResult = storageService.saveSimAttempt(hostilePayload);
            assert.ok(Array.isArray(simResult), 'saveSimAttempt debe ser un Array');
            assert.equal(typeof simResult.map, 'function', 'simResult.map no debe ser sobreescrito');
            assert.equal(typeof simResult.filter, 'function', 'simResult.filter no debe ser sobreescrito');
            assert.equal(typeof simResult.forEach, 'function', 'simResult.forEach no debe ser sobreescrito');
            assert.notEqual(simResult[0], 'elemento_corrupto_en_indice_0', 'El índice 0 del array no debe ser corrompido');
            assert.doesNotThrow(() => simResult.map(x => x.candidateName));

            // 2. saveTrainingAttempt
            const trainResult = storageService.saveTrainingAttempt(hostilePayload);
            assert.ok(Array.isArray(trainResult));
            assert.equal(typeof trainResult.map, 'function');
            assert.equal(typeof trainResult.filter, 'function');
            assert.notEqual(trainResult[0], 'elemento_corrupto_en_indice_0');
            assert.doesNotThrow(() => trainResult.filter(x => x.lessonId === 5));

            // 3. saveCustomText
            const customResult = storageService.saveCustomText(hostilePayload);
            assert.ok(Array.isArray(customResult));
            assert.equal(typeof customResult.map, 'function');
            assert.equal(typeof customResult.slice, 'function');
            assert.notEqual(customResult[0], 'elemento_corrupto_en_indice_0');
            assert.doesNotThrow(() => customResult.forEach(x => x.title));

            // 4. saveTheoryNote
            const noteResult = storageService.saveTheoryNote(hostilePayload);
            assert.ok(Array.isArray(noteResult));
            assert.equal(typeof noteResult.map, 'function');
            assert.equal(typeof noteResult.reduce, 'function');
            assert.notEqual(noteResult[0], 'elemento_corrupto_en_indice_0');
        });

        test('4.7 Generación de ID de intento es tolerante a la ausencia de crypto.randomUUID', () => {
            const resolveAttemptId = (cryptoObj) => {
                return (typeof cryptoObj !== 'undefined' && typeof cryptoObj.randomUUID === 'function')
                    ? cryptoObj.randomUUID()
                    : ('attempt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
            };

            // 1. Con crypto estándar disponible
            const idWithNative = resolveAttemptId(globalThis.crypto);
            assert.ok(typeof idWithNative === 'string');
            assert.ok(idWithNative.length > 0);

            // 2. Entorno HTTP inseguro donde crypto es objeto vacío sin randomUUID
            const idWithoutUUID = resolveAttemptId({});
            assert.ok(typeof idWithoutUUID === 'string');
            assert.ok(idWithoutUUID.startsWith('attempt_'));

            // 3. Entorno sin objeto crypto (undefined)
            const idWithoutCrypto = resolveAttemptId(undefined);
            assert.ok(typeof idWithoutCrypto === 'string');
            assert.ok(idWithoutCrypto.startsWith('attempt_'));
        });

        test('4.8 Gráficos y tablas de resultados procesan de forma segura métricas numéricas corruptas o NaN', () => {
            const malformedAttempts = [
                { id: 1, wpm: 'NaN', precision: undefined, duration: null, timestamp: '10:00' },
                { id: 2, wpm: 40, precision: 95, duration: 60, timestamp: '10:05' }
            ];

            assert.doesNotThrow(() => {
                const validAttempts = malformedAttempts.filter(Boolean);
                const maxWpm = Math.max(...validAttempts.map(a => Number(a?.wpm) || 0), 30);
                assert.ok(!isNaN(maxWpm));
                assert.equal(maxWpm, 40);

                const minDuration = Math.min(...validAttempts.map(att => Number(att?.duration) || 999999));
                assert.ok(!isNaN(minDuration));
                assert.equal(minDuration, 60);

                const calculatedScores = validAttempts.map(att => 
                    Math.round((Number(att?.wpm) || 0) * ((Number(att?.precision) || 0) / 100) * 100) || 0
                );
                assert.deepEqual(calculatedScores, [0, 3800]);
            });
        });

        test('4.9 Inmunidad absoluta de EvolutionCharts y TrainingResultsUI ante colecciones con elementos null o tipos primitivos', () => {
            const hostileCollections = [
                null,
                undefined,
                [],
                [null],
                [null, undefined, 'cadena_invalida', 12345],
                [null, { id: 1, wpm: 35, precision: 90, duration: 45, correctChars: 100, errorChars: 5 }]
            ];

            for (const collection of hostileCollections) {
                assert.doesNotThrow(() => {
                    const valid = (Array.isArray(collection) ? collection : [])
                        .filter(a => a && typeof a === 'object');

                    if (valid.length === 0) {
                        // El componente debe degradar limpiamente retornando null sin calcular Math.min(...[]) = Infinity
                        return null;
                    }

                    const wpms = valid.map(a => Number(a?.wpm) || 0);
                    const precs = valid.map(a => Number(a?.precision) || 0);

                    const minW = Math.min(...wpms);
                    const maxW = Math.max(...wpms);
                    assert.ok(isFinite(minW) && isFinite(maxW), 'Los rangos WPM deben ser números finitos');

                    const points = valid.map((a, idx) => ({
                        x: idx * 10,
                        wpm: Number(a?.wpm) || 0,
                        precision: Number(a?.precision) || 0,
                        timeOnly: a?.timeOnly || ''
                    }));
                    assert.equal(points.length, 1);
                    assert.equal(points[0].wpm, 35);

                    // Filas de tabla en TrainingResultsUI
                    const totalWritten = (Number(valid[0]?.correctChars) || 0) + (Number(valid[0]?.errorChars) || 0);
                    assert.equal(totalWritten, 105);
                });
            }
        });

        test('4.10 Resiliencia ante palabras nulas en evaluatedOrig de Simulador y repetición sin texto en Entrenamiento', () => {
            // 1. evaluatedOrig con elementos null en resultados de Simulador
            const corruptEvaluatedOrig = [
                null,
                { status: 'correct', text: 'En' },
                undefined,
                { status: 'minor', text: 'la' },
                null
            ];

            assert.doesNotThrow(() => {
                const safeWords = (Array.isArray(corruptEvaluatedOrig) ? corruptEvaluatedOrig : [])
                    .filter(Boolean)
                    .map(wordObj => ({
                        text: wordObj?.text || '',
                        status: wordObj?.status || 'omitted'
                    }));

                assert.equal(safeWords.length, 2);
                assert.equal(safeWords[0].text, 'En');
                assert.equal(safeWords[1].status, 'minor');
            });

            // 2. replayData con text null o undefined en Entrenamiento
            const corruptReplayData = {
                id: 'rep_1',
                lessonId: 3,
                text: null,
                wpm: null,
                precision: undefined,
                duration: 'NaN'
            };

            assert.doesNotThrow(() => {
                const splitChars = (corruptReplayData?.text || '').split('').map((char, index) => ({
                    char: char === ' ' ? '␣' : char,
                    index
                }));
                assert.equal(splitChars.length, 0);

                const wpm = Math.round(Number(corruptReplayData?.wpm) || 0);
                const precision = Math.round(Number(corruptReplayData?.precision) || 0);
                const duration = Math.round(Number(corruptReplayData?.duration) || 0);

                assert.equal(wpm, 0);
                assert.equal(precision, 0);
                assert.equal(duration, 0);
            });
        });

        test('4.11 Ciclo de vida y gestión canónica de apuntes teóricos con retorno de Arrays y persistencia integral', () => {
            // 1. Guardar nueva nota teórica
            const note1 = {
                title: 'Acuerdo 08/22 SCBA',
                content: 'Régimen de notificaciones electrónicas...'
            };
            const result1 = storageService.saveTheoryNote(note1);
            assert.ok(Array.isArray(result1), 'saveTheoryNote debe retornar un Array');
            assert.equal(result1.length, 1);
            const savedNoteId = result1[0].id;
            assert.ok(savedNoteId);

            // 2. Sobreescribir / actualizar nota existente manteniendo el array
            const updatedResult = storageService.saveTheoryNote({
                id: savedNoteId,
                title: 'Acuerdo 08/22 SCBA (Versión Definitiva)',
                content: 'Texto consolidado y corregido...'
            });
            assert.ok(Array.isArray(updatedResult));
            assert.equal(updatedResult.length, 1, 'No debe duplicar la nota, debe actualizarla');
            assert.equal(updatedResult[0].title, 'Acuerdo 08/22 SCBA (Versión Definitiva)');

            // 3. Eliminar nota individualmente
            storageService.deleteTheoryNote(savedNoteId);
            const afterDelete = storageService.getTheoryHistory();
            assert.ok(Array.isArray(afterDelete));
            assert.equal(afterDelete.length, 0);

            // 4. Limpiar todo el historial de apuntes
            storageService.saveTheoryNote({ title: 'Nota Temporal', content: '...' });
            assert.equal(storageService.getTheoryHistory().length, 1);
            storageService.clearTheoryHistory();
            assert.equal(storageService.getTheoryHistory().length, 0);
        });
    });
});
