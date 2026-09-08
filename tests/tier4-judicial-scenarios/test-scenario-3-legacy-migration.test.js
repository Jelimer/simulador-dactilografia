/**
 * Tier 4 - Escenario Real 3: Postulante Histórico con Migración de Alias y Datos Preexistentes
 * Simula el regreso de un usuario con datos creados en versiones previas (2024):
 * clave alias dactilografia_custom_texts, intentos antiguos en dactilografia_simulador_historial
 * y nombre de postulante preexistente.
 * Verifica la migración transparente sin pérdida de datos y la continuidad del flujo de examen.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, evaluateTyping, resetStorageService } from '../helpers/contracts.js';

describe('Tier 4 - Escenario 3: Postulante Histórico con Migración de Datos de 2024', () => {
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

    test('Migración transparente de textos personalizados legacy y convivencia con historial histórico', () => {
        // 1. Inyectar estado preexistente de 2024 antes de la actualización modular
        const legacyTexts2024 = [
            { id: 101, title: 'Sentencia de Quiebras 2024', content: 'Vistos y Considerando los autos principales...', isCustom: true },
            { id: 102, title: 'Cédula Notificación Concursal', content: 'Hágase saber al síndico interviniente...', isCustom: true },
            { id: 103, title: 'Fallo Plenario STJ 2024', content: 'Fijar doctrina legal obligatoria para los tribunales inferiores...', isCustom: true }
        ];
        const historicalAttempts2024 = [
            { id: 1, candidateName: 'Escribano Gómez', timestamp: '10/05/2024', accountedWords: 135, passed: false },
            { id: 2, candidateName: 'Escribano Gómez', timestamp: '15/05/2024', accountedWords: 142, passed: true },
            { id: 3, candidateName: 'Escribano Gómez', timestamp: '20/05/2024', accountedWords: 148, passed: true }
        ];

        mockStorage.setItem('dactilografia_userName', 'Escribano Gómez');
        mockStorage.setItem('dactilografia_custom_texts', JSON.stringify(legacyTexts2024));
        mockStorage.setItem('dactilografia_simulador_historial', JSON.stringify(historicalAttempts2024));

        // 2. Ejecutar inicialización y migraciones del sistema
        storageService.runMigrations();

        // 3. Verificar que el nombre del postulante histórico sigue intacto
        assert.equal(storageService.getUserName(), 'Escribano Gómez');

        // 4. Verificar que los 3 textos personalizados de 2024 se migraron a la clave canónica
        const canonicalTexts = storageService.getCustomTexts();
        assert.equal(canonicalTexts.length, 3, 'Los 3 textos de 2024 deben estar disponibles');
        assert.ok(canonicalTexts.some(t => t.id === 101 && t.title === 'Sentencia de Quiebras 2024'));
        assert.ok(canonicalTexts.some(t => t.id === 103 && t.title === 'Fallo Plenario STJ 2024'));

        // 5. Verificar que los 3 intentos históricos de 2024 siguen presentes
        const initialHist = storageService.getSimHistory();
        assert.equal(initialHist.length, 3, 'Los 3 intentos previos de 2024 deben preservarse');

        // 6. El postulante selecciona su fallo de 2024 y rinde un nuevo intento en 2026
        const selectedText = canonicalTexts.find(t => t.id === 101);
        const evalResult = evaluateTyping(selectedText.content, selectedText.content, 300, 140);

        const newAttempt2026 = {
            id: 20260907,
            candidateName: storageService.getUserName(),
            timestamp: '07/09/2026',
            textTitle: selectedText.title,
            passed: true,
            ...evalResult
        };

        storageService.saveSimAttempt(newAttempt2026);

        // 7. El historial ahora contiene 4 intentos: el nuevo al inicio y los 3 históricos de 2024 intactos
        const updatedHistory = storageService.getSimHistory();
        assert.equal(updatedHistory.length, 4, '1 intento nuevo + 3 históricos = 4 en total');
        assert.equal(updatedHistory[0].id, 20260907, 'El más reciente debe estar en la cima');
        assert.equal(updatedHistory[1].id, 1);
        assert.equal(updatedHistory[3].id, 3);
    });
});
