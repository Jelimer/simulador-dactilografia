/**
 * Tier 2 - Casos de Borde y Resiliencia: Cuota de Almacenamiento Llena (QuotaExceededError)
 * Verifica que ante el límite de cuota de 5MB o error QuotaExceededError,
 * el sistema aplique poda inteligente de registros antiguos y fallback transparente en memoria.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { CanonicalStorageService } from '../helpers/contracts.js';

describe('Tier 2: Manejo de Cuota de Almacenamiento Llena (QuotaExceededError)', () => {
    let mockStorage;
    let storageService;

    beforeEach(() => {
        mockStorage = setupTestStorage({ quotaLimit: 5 * 1024 * 1024 });
        storageService = new CanonicalStorageService();
    });

    afterEach(() => {
        if (mockStorage) {
            mockStorage.uninstall();
        }
    });

    test('1. safeSet captura QuotaExceededError sin lanzar excepciones fatales a la interfaz', () => {
        mockStorage.simulateQuotaExceeded(true);

        assert.doesNotThrow(() => {
            storageService.setUserName('Dr. Sin Espacio');
        });
    });

    test('2. Ante QuotaExceededError, se ejecuta poda de historiales antiguos para liberar espacio', () => {
        // Cargar 10 intentos de simulación previos
        const initialList = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            candidateName: `Candidato ${i + 1}`,
            accountedWords: 140
        }));
        mockStorage.setItem('dactilografia_simulador_historial', JSON.stringify(initialList));

        // Provocar intento de poda ejecutando _pruneHistory
        storageService._pruneHistory();

        const pruned = JSON.parse(mockStorage.getItem('dactilografia_simulador_historial'));
        assert.ok(pruned.length < 10, 'Debe haber podado registros antiguos');
        assert.equal(pruned.length, 5, 'Debe conservar los 5 más recientes');
    });

    test('3. Reintento de guardado tras poda conserva los intentos más recientes', () => {
        const initialList = Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            candidateName: `Intento ${i + 1}`
        }));
        mockStorage.setItem('dactilografia_simulador_historial', JSON.stringify(initialList));

        // Forzar límite muy pequeño para provocar QuotaExceededError
        mockStorage.setQuotaLimit(2000);

        // Guardar nuevo intento
        storageService.saveSimAttempt({ id: 999, candidateName: 'Nuevo Intento Reciente' });

        const history = storageService.getSimHistory();
        assert.ok(history.length > 0);
        assert.equal(history[0].candidateName, 'Nuevo Intento Reciente');
    });

    test('4. Fallback transparente a almacenamiento en memoria cuando el disco queda totalmente bloqueado', () => {
        // Simular que el navegador bloquea permanentemente localStorage
        mockStorage.simulateQuotaExceeded(true);

        // Guardar en estado de bloqueo
        storageService.setUserName('Postulante en Memoria');
        storageService.setTheme('light');

        assert.equal(storageService.isMemoryFallback, true, 'Debe activar bandera isMemoryFallback');
        assert.equal(storageService.getUserName(), 'Postulante en Memoria');
        assert.equal(storageService.getTheme(), 'light');
    });

    test('5. Operaciones de lectura y escritura subsecuentes continúan trabajando sin interrupción durante la sesión', () => {
        mockStorage.simulateQuotaExceeded(true);

        storageService.saveSimAttempt({ id: 501, candidateName: 'Dr. Mendoza', passed: true });
        storageService.saveTheoryNote({ title: 'Apunte en emergencia', content: 'Contenido' });

        const simHist = storageService.getSimHistory();
        const theoryHist = storageService.getTheoryHistory();

        assert.equal(simHist.length, 1);
        assert.equal(simHist[0].candidateName, 'Dr. Mendoza');
        assert.equal(theoryHist.length, 1);
        assert.equal(theoryHist[0].title, 'Apunte en emergencia');
    });
});
