/**
 * Tier 3 - Interacciones Cruzadas: Historial Acumulativo Multi-Sesión y Aislamiento de Borrado
 * Verifica la acumulación de múltiples intentos de examen y entrenamiento,
 * cálculo de promedios de rendimiento y el aislamiento estricto al vaciar historiales específicos.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, resetStorageService } from '../helpers/contracts.js';

describe('Tier 3: Historial Acumulativo Multi-Sesión y Aislamiento', () => {
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

    test('1. Acumulación sucesiva de 10 intentos de examen mantiene orden cronológico inverso exacto', () => {
        for (let i = 1; i <= 10; i++) {
            storageService.saveSimAttempt({
                id: i,
                candidateName: 'Dr. Mendoza',
                wpm: (25 + i).toFixed(1),
                passed: i >= 5
            });
        }

        const history = storageService.getSimHistory();
        assert.equal(history.length, 10);
        // El último guardado (id 10) debe estar al inicio
        assert.equal(history[0].id, 10);
        assert.equal(history[9].id, 1);
    });

    test('2. Uso concurrente de las 3 áreas (Simulador, Entrenamiento, Teoría) no causa interferencia cruzada', () => {
        storageService.saveSimAttempt({ id: 101, candidateName: 'Dr. Concurrente' });
        storageService.saveTrainingAttempt({ lessonId: 1, accuracy: 95 });
        storageService.saveTheoryNote({ title: 'Apunte 1' });

        assert.equal(storageService.getSimHistory().length, 1);
        assert.equal(storageService.getTrainingHistory().length, 1);
        assert.equal(storageService.getTheoryHistory().length, 1);
    });

    test('3. clearSimHistory() vacía exclusivamente el simulador sin tocar lecciones ni teoría', () => {
        storageService.setUserName('Dra. Preservada');
        storageService.setTheme('light');
        storageService.saveSimAttempt({ id: 1 });
        storageService.saveTrainingAttempt({ lessonId: 2 });
        storageService.saveTheoryNote({ title: 'Nota' });

        storageService.clearSimHistory();

        assert.equal(storageService.getSimHistory().length, 0, 'Simulador debe estar vacío');
        assert.equal(storageService.getTrainingHistory().length, 1, 'Entrenamiento debe preservarse');
        assert.equal(storageService.getTheoryHistory().length, 1, 'Teoría debe preservarse');
        assert.equal(storageService.getUserName(), 'Dra. Preservada', 'Postulante debe preservarse');
        assert.equal(storageService.getTheme(), 'light', 'Tema debe preservarse');
    });

    test('4. clearTheoryHistory() vacía exclusivamente notas teóricas sin tocar simulador ni entrenamiento', () => {
        storageService.saveSimAttempt({ id: 1 });
        storageService.saveTrainingAttempt({ lessonId: 1 });
        storageService.saveTheoryNote({ title: 'Nota 1' });
        storageService.saveTheoryNote({ title: 'Nota 2' });

        storageService.clearTheoryHistory();

        assert.equal(storageService.getTheoryHistory().length, 0);
        assert.equal(storageService.getSimHistory().length, 1);
        assert.equal(storageService.getTrainingHistory().length, 1);
    });

    test('5. Métricas agregadas: cálculo exacto de promedio de PPM y tasa de aprobación sobre historial acumulado', () => {
        const attempts = [
            { id: 1, accountedWords: 130, wpm: '26.0', passed: false },
            { id: 2, accountedWords: 140, wpm: '28.0', passed: true },
            { id: 3, accountedWords: 150, wpm: '30.0', passed: true },
            { id: 4, accountedWords: 160, wpm: '32.0', passed: true }
        ];

        for (const att of attempts) {
            storageService.saveSimAttempt(att);
        }

        const history = storageService.getSimHistory();
        assert.equal(history.length, 4);

        const totalWpm = history.reduce((acc, curr) => acc + parseFloat(curr.wpm), 0);
        const avgWpm = (totalWpm / history.length).toFixed(1);
        const passedCount = history.filter(h => h.passed).length;
        const passRate = Math.round((passedCount / history.length) * 100);

        // Promedio WPM: (26 + 28 + 30 + 32) / 4 = 29.0 PPM
        assert.equal(avgWpm, '29.0');
        // Tasa de aprobación: 3 de 4 = 75%
        assert.equal(passRate, 75);
    });
});
