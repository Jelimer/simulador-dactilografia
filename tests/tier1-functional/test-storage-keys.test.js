/**
 * Tier 1 - Cobertura Funcional: Persistencia de Claves en localStorage
 * Verifica exhaustivamente las 6 claves persistidas con >=5 pruebas por funcionalidad.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, resetStorageService } from '../helpers/contracts.js';

describe('Tier 1: Persistencia de Claves en localStorage', () => {
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
    // 1. Clave: dactilografia_userName (>=5 tests)
    // ------------------------------------------------------------------------
    describe('Clave 1: dactilografia_userName', () => {
        test('1.1 Debe retornar "POSTULANTE_001" por defecto cuando no hay valor previo', () => {
            const name = storageService.getUserName();
            assert.equal(name, 'POSTULANTE_001');
        });

        test('1.2 Debe guardar y recuperar un nombre de postulante válido', () => {
            storageService.setUserName('Dr. Carlos Alberto Mendoza');
            assert.equal(storageService.getUserName(), 'Dr. Carlos Alberto Mendoza');
            assert.equal(mockStorage.getItem('dactilografia_userName'), 'Dr. Carlos Alberto Mendoza');
        });

        test('1.3 Debe aplicar trim automático a espacios en blanco al inicio y final', () => {
            storageService.setUserName('   Dra. María Laura Silveira   ');
            assert.equal(storageService.getUserName(), 'Dra. María Laura Silveira');
        });

        test('1.4 Debe activar fallback a "POSTULANTE_001" si se ingresa cadena vacía o solo espacios', () => {
            storageService.setUserName('     ');
            assert.equal(storageService.getUserName(), 'POSTULANTE_001');

            storageService.setUserName('');
            assert.equal(storageService.getUserName(), 'POSTULANTE_001');
        });

        test('1.5 Debe permitir actualizar sucesivamente el postulante sin mutar otras claves', () => {
            storageService.setTheme('light');
            storageService.setUserName('Primer Postulante');
            assert.equal(storageService.getUserName(), 'Primer Postulante');

            storageService.setUserName('Segundo Postulante');
            assert.equal(storageService.getUserName(), 'Segundo Postulante');
            assert.equal(storageService.getTheme(), 'light');
        });
    });

    // ------------------------------------------------------------------------
    // 2. Clave: dactilografia_theme (>=5 tests)
    // ------------------------------------------------------------------------
    describe('Clave 2: dactilografia_theme', () => {
        test('2.1 Debe retornar "dark" por defecto al no existir configuración previa', () => {
            assert.equal(storageService.getTheme(), 'dark');
        });

        test('2.2 Debe guardar tema "light" y recuperarlo fielmente', () => {
            storageService.setTheme('light');
            assert.equal(storageService.getTheme(), 'light');
            assert.equal(mockStorage.getItem('dactilografia_theme'), 'light');
        });

        test('2.3 Debe permitir alternar entre "light" y "dark" de forma determinista', () => {
            storageService.setTheme('light');
            assert.equal(storageService.getTheme(), 'light');

            storageService.setTheme('dark');
            assert.equal(storageService.getTheme(), 'dark');
        });

        test('2.4 Debe normalizar temas inválidos o no reconocidos al valor por defecto "dark"', () => {
            storageService.setTheme('neon-blue');
            assert.equal(storageService.getTheme(), 'dark');
        });

        test('2.5 La lectura de tema debe ser una operación pura que no altere el storage', () => {
            const initialLen = mockStorage.length;
            const theme = storageService.getTheme();
            assert.equal(theme, 'dark');
            assert.equal(mockStorage.length, initialLen);
        });
    });

    // ------------------------------------------------------------------------
    // 3. Clave: dactilografia_custom_legal_texts (>=5 tests)
    // ------------------------------------------------------------------------
    describe('Clave 3: dactilografia_custom_legal_texts', () => {
        test('3.1 Debe retornar un arreglo vacío [] cuando no hay textos personalizados', () => {
            const texts = storageService.getCustomTexts();
            assert.ok(Array.isArray(texts));
            assert.equal(texts.length, 0);
        });

        test('3.2 Debe guardar un nuevo texto judicial con id único y bandera isCustom: true', () => {
            const created = storageService.saveCustomText({
                title: 'Sentencia de Cámara Contenciosa',
                content: 'En la ciudad de Corrientes, a los cinco días del mes de mayo...'
            });

            assert.ok(created.id > 0);
            assert.equal(created.title, 'Sentencia de Cámara Contenciosa');
            assert.equal(created.isCustom, true);

            const all = storageService.getCustomTexts();
            assert.equal(all.length, 1);
            assert.equal(all[0].id, created.id);
        });

        test('3.3 Debe preservar múltiples textos con su orden de inserción', () => {
            storageService.saveCustomText({ id: 1, title: 'Texto 1', content: 'Contenido 1' });
            storageService.saveCustomText({ id: 2, title: 'Texto 2', content: 'Contenido 2' });
            storageService.saveCustomText({ id: 3, title: 'Texto 3', content: 'Contenido 3' });

            const all = storageService.getCustomTexts();
            assert.equal(all.length, 3);
            assert.equal(all[0].title, 'Texto 1');
            assert.equal(all[2].title, 'Texto 3');
        });

        test('3.4 Debe eliminar un texto específico por ID sin afectar a los restantes', () => {
            const t1 = storageService.saveCustomText({ id: 101, title: 'A borrar', content: 'C1' });
            const t2 = storageService.saveCustomText({ id: 102, title: 'A mantener', content: 'C2' });

            storageService.deleteCustomText(t1.id);
            const remaining = storageService.getCustomTexts();

            assert.equal(remaining.length, 1);
            assert.equal(remaining[0].id, t2.id);
            assert.equal(remaining[0].title, 'A mantener');
        });

        test('3.5 Debe persistir el contenido serializado en formato JSON válido', () => {
            storageService.saveCustomText({ title: 'Auto Interlocutorio', content: 'Vistos y Considerando' });
            const raw = mockStorage.getItem('dactilografia_custom_legal_texts');
            assert.ok(raw);
            const parsed = JSON.parse(raw);
            assert.ok(Array.isArray(parsed));
            assert.equal(parsed[0].title, 'Auto Interlocutorio');
        });
    });

    // ------------------------------------------------------------------------
    // 4. Clave: dactilografia_simulador_historial (>=5 tests)
    // ------------------------------------------------------------------------
    describe('Clave 4: dactilografia_simulador_historial', () => {
        test('4.1 Debe retornar [] si el historial está vacío', () => {
            const history = storageService.getSimHistory();
            assert.ok(Array.isArray(history));
            assert.equal(history.length, 0);
        });

        test('4.2 Debe registrar un intento con métricas judiciales completas', () => {
            const attempt = {
                id: 1001,
                candidateName: 'Dr. Mendoza',
                timestamp: '07/09/2026, 09:30',
                textTitle: 'Constitución Provincial',
                timeLimitMinutes: 5,
                requiredWords: 140,
                accountedWords: 145.5,
                wpm: '29.1',
                errorsPerMinute: '0.6',
                passed: true,
                strictMode: true
            };

            storageService.saveSimAttempt(attempt);
            const history = storageService.getSimHistory();

            assert.equal(history.length, 1);
            assert.equal(history[0].candidateName, 'Dr. Mendoza');
            assert.equal(history[0].accountedWords, 145.5);
            assert.equal(history[0].passed, true);
        });

        test('4.3 Los intentos nuevos deben insertarse al inicio (orden cronológico inverso)', () => {
            storageService.saveSimAttempt({ id: 1, candidateName: 'Intento 1' });
            storageService.saveSimAttempt({ id: 2, candidateName: 'Intento 2' });

            const history = storageService.getSimHistory();
            assert.equal(history[0].id, 2);
            assert.equal(history[1].id, 1);
        });

        test('4.4 clearSimHistory debe vaciar completamente el historial de simulación', () => {
            storageService.saveSimAttempt({ id: 1 });
            storageService.saveSimAttempt({ id: 2 });
            assert.equal(storageService.getSimHistory().length, 2);

            storageService.clearSimHistory();
            assert.equal(storageService.getSimHistory().length, 0);
        });

        test('4.5 Debe preservar la integridad de datos booleanos y numéricos tras serialización', () => {
            storageService.saveSimAttempt({
                id: 999,
                passed: false,
                strictMode: true,
                accountedWords: 120.5,
                wpm: '24.1'
            });

            const saved = storageService.getSimHistory()[0];
            assert.strictEqual(saved.passed, false);
            assert.strictEqual(saved.strictMode, true);
            assert.strictEqual(saved.accountedWords, 120.5);
        });
    });

    // ------------------------------------------------------------------------
    // 5. Claves: dactilografia_historial y dactilografia_teoria_historial (>=5 tests)
    // ------------------------------------------------------------------------
    describe('Claves 5 y 6: dactilografia_historial y dactilografia_teoria_historial', () => {
        test('5.1 dactilografia_historial: debe almacenar y recuperar intentos de lecciones de entrenamiento', () => {
            assert.equal(storageService.getTrainingHistory().length, 0);
            storageService.saveTrainingAttempt({ lessonId: 1, wpm: 35, precision: 98 });
            
            const history = storageService.getTrainingHistory();
            assert.equal(history.length, 1);
            assert.equal(history[0].lessonId, 1);
            assert.equal(history[0].precision, 98);
        });

        test('5.2 dactilografia_historial: debe acumular múltiples lecciones sucesivamente', () => {
            storageService.saveTrainingAttempt({ lessonId: 1, wpm: 30 });
            storageService.saveTrainingAttempt({ lessonId: 2, wpm: 34 });
            storageService.saveTrainingAttempt({ lessonId: 3, wpm: 40 });

            assert.equal(storageService.getTrainingHistory().length, 3);
        });

        test('5.3 dactilografia_teoria_historial: debe guardar apuntes teóricos con timestamp', () => {
            const note = storageService.saveTheoryNote({
                title: 'Resumen Ley 22.172',
                content: 'Comunicaciones entre tribunales de distinta jurisdicción territorial...'
            });

            assert.ok(note.id);
            assert.ok(note.timestamp);
            assert.equal(note.title, 'Resumen Ley 22.172');

            const allNotes = storageService.getTheoryHistory();
            assert.equal(allNotes.length, 1);
            assert.equal(allNotes[0].id, note.id);
        });

        test('5.4 dactilografia_teoria_historial: clearTheoryHistory vacía notas sin afectar simulación', () => {
            storageService.saveSimAttempt({ id: 1, candidateName: 'Dr. Test' });
            storageService.saveTheoryNote({ title: 'Nota 1', content: 'Contenido' });

            storageService.clearTheoryHistory();
            assert.equal(storageService.getTheoryHistory().length, 0);
            assert.equal(storageService.getSimHistory().length, 1);
        });

        test('5.5 Aislamiento estricto: las 6 claves residen en particiones independientes de localStorage', () => {
            storageService.setUserName('Dra. Aislada');
            storageService.setTheme('light');
            storageService.saveCustomText({ title: 'T1', content: 'C1' });
            storageService.saveSimAttempt({ id: 10 });
            storageService.saveTrainingAttempt({ lessonId: 5 });
            storageService.saveTheoryNote({ title: 'N1' });

            assert.equal(storageService.getUserName(), 'Dra. Aislada');
            assert.equal(storageService.getTheme(), 'light');
            assert.equal(storageService.getCustomTexts().length, 1);
            assert.equal(storageService.getSimHistory().length, 1);
            assert.equal(storageService.getTrainingHistory().length, 1);
            assert.equal(storageService.getTheoryHistory().length, 1);
        });
    });
});
