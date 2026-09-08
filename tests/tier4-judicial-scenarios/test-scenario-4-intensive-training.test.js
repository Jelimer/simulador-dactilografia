/**
 * Tier 4 - Escenario Real 4: Sesión Intensiva de Mecanografía (20 lecciones consecutivas)
 * Simula el entrenamiento de un postulante completando 20 lecciones de la Fila Guía
 * y Fila Superior de forma sucesiva, calculando precisión y PPM por lección
 * y acumulando 20 registros consistentes en dactilografia_historial.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, resetStorageService } from '../helpers/contracts.js';
import { TRAINING_LESSONS } from '../helpers/fixtures.js';

describe('Tier 4 - Escenario 4: Sesión Intensiva de Mecanografía (20 Lecciones Consecutivas)', () => {
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

    test('Ejecución consecutiva de 20 lecciones con cálculo de métricas y registro en dactilografia_historial', () => {
        // Seleccionar las primeras 20 lecciones pedagógicas
        const selectedLessons = TRAINING_LESSONS.slice(0, 20);
        assert.equal(selectedLessons.length, 20, 'Debe haber 20 lecciones disponibles');

        const sessionResults = [];

        // Simular ejecución lección por lección
        for (let i = 0; i < selectedLessons.length; i++) {
            const lesson = selectedLessons[i];
            const text = lesson.text;
            const totalChars = text.length;

            // Simular tipeo con 0 o 1 error aleatorio por lección
            const errors = i % 3 === 0 ? 1 : 0;
            const correctChars = totalChars - errors;
            const accuracy = Math.round((correctChars / totalChars) * 100);

            // Tiempo simulado en segundos proporcional al texto
            const timeSec = Math.max(10, Math.round(totalChars / 5)); // ~5 caracteres por segundo
            const minutes = timeSec / 60;
            const words = correctChars / 5;
            const wpm = Math.round(words / minutes);

            const record = {
                id: 1000 + i,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                section: lesson.section,
                precision: accuracy,
                accuracy,
                wpm,
                errors,
                timestamp: new Date().toISOString()
            };

            // Guardar en almacenamiento
            storageService.saveTrainingAttempt(record);
            sessionResults.push(record);
        }

        // Verificaciones
        const savedHistory = storageService.getTrainingHistory();
        assert.equal(savedHistory.length, 20, 'Deben haberse persistido exactamente 20 lecciones');

        // Verificar consistencia de cada lección
        for (let i = 0; i < 20; i++) {
            assert.equal(savedHistory[i].lessonId, selectedLessons[i].id);
            assert.ok(savedHistory[i].precision >= 90, 'La precisión debe superar el 90%');
            assert.ok(savedHistory[i].wpm > 0, 'La velocidad WPM debe ser positiva');
        }

        // Calcular promedio de la sesión intensiva
        const avgAccuracy = Math.round(savedHistory.reduce((a, b) => a + (b.precision ?? b.accuracy), 0) / 20);
        const avgWpm = Math.round(savedHistory.reduce((a, b) => a + b.wpm, 0) / 20);

        assert.ok(avgAccuracy >= 95, `Precisión promedio esperada >= 95%, obtenido: ${avgAccuracy}%`);
        assert.ok(avgWpm >= 20, `Velocidad promedio esperada >= 20 PPM, obtenido: ${avgWpm} PPM`);
    });
});
