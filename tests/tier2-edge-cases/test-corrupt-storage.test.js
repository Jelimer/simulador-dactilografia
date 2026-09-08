/**
 * Tier 2 - Casos de Borde y Resiliencia: Almacenamiento Corrupto (JSON inválido)
 * Verifica que el sistema tolere datos dañados en localStorage sin crashear
 * (solucionando de raíz el crash histórico de la línea 604 en App.jsx).
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, resetStorageService } from '../helpers/contracts.js';
import { CORRUPT_PAYLOADS } from '../helpers/fixtures.js';

describe('Tier 2: Resiliencia ante localStorage Corrupto (JSON inválido)', () => {
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

    test('1. dactilografia_simulador_historial corrupto con JSON inválido retorna [] sin lanzar excepción (Fix crash línea 604)', () => {
        // Simular lo que causaba el fallo fatal en App.jsx línea 604:
        // const saved = localStorage.getItem('dactilografia_simulador_historial'); return saved ? JSON.parse(saved) : [];
        mockStorage.corrupt('dactilografia_simulador_historial', '{bad_json: "unterminated string...');

        assert.doesNotThrow(() => {
            const history = storageService.getSimHistory();
            assert.ok(Array.isArray(history));
            assert.equal(history.length, 0);
        });
    });

    test('2. dactilografia_custom_legal_texts corrupto retorna [] y previene falla en catálogo', () => {
        mockStorage.corrupt('dactilografia_custom_legal_texts', '<html>500 Error</html>');

        assert.doesNotThrow(() => {
            const texts = storageService.getCustomTexts();
            assert.ok(Array.isArray(texts));
            assert.equal(texts.length, 0);
        });
    });

    test('3. dactilografia_historial (entrenamiento) corrupto retorna [] de forma segura', () => {
        mockStorage.corrupt('dactilografia_historial', 'undefined');

        assert.doesNotThrow(() => {
            const history = storageService.getTrainingHistory();
            assert.ok(Array.isArray(history));
            assert.equal(history.length, 0);
        });
    });

    test('4. dactilografia_teoria_historial corrupto retorna [] y no interrumpe la carga de apuntes', () => {
        mockStorage.corrupt('dactilografia_teoria_historial', '[{"id": 1, "title": incomplete...');

        assert.doesNotThrow(() => {
            const notes = storageService.getTheoryHistory();
            assert.ok(Array.isArray(notes));
            assert.equal(notes.length, 0);
        });
    });

    test('5. Valores primitivos o tipos no arreglo (ej. número serializado o booleano) se normalizan a []', () => {
        mockStorage.corrupt('dactilografia_simulador_historial', '12345');
        const history = storageService.getSimHistory();
        assert.ok(Array.isArray(history), 'Debe normalizarse a arreglo');
        assert.equal(history.length, 0);

        mockStorage.corrupt('dactilografia_custom_legal_texts', 'true');
        const texts = storageService.getCustomTexts();
        assert.ok(Array.isArray(texts), 'Debe normalizarse a arreglo');
        assert.equal(texts.length, 0);
    });

    test('6. Guardado posterior tras leer datos corruptos repara la clave y restaura JSON válido', () => {
        mockStorage.corrupt('dactilografia_simulador_historial', 'CORRUPTO!!!');

        const newAttempt = { id: 2026, candidateName: 'Dr. Resiliente', accountedWords: 140 };
        storageService.saveSimAttempt(newAttempt);

        const restoredHistory = storageService.getSimHistory();
        assert.equal(restoredHistory.length, 1);
        assert.equal(restoredHistory[0].candidateName, 'Dr. Resiliente');

        // Verificar que en storage quedó un JSON perfectamente parseable
        const raw = mockStorage.getItem('dactilografia_simulador_historial');
        assert.doesNotThrow(() => JSON.parse(raw));
    });
});
