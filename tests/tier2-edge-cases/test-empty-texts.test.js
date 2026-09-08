/**
 * Tier 2 - Casos de Borde y Resiliencia: Textos Vacíos y Nulos
 * Valida la robustez del evaluador y del almacenamiento ante cadenas vacías,
 * solo espacios en blanco, tabs, saltos de línea y nombres de postulante nulos.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, getTypingEvaluator } from '../helpers/contracts.js';
import { SPECIAL_TEXTS } from '../helpers/fixtures.js';

describe('Tier 2: Manejo de Textos Vacíos y Nulos', async () => {
    let mockStorage;
    let storageService;
    const { evaluateTyping } = await getTypingEvaluator();

    beforeEach(async () => {
        mockStorage = setupTestStorage();
        storageService = await getStorageService();
    });

    afterEach(() => {
        if (mockStorage) {
            mockStorage.uninstall();
        }
    });

    test('1. Texto original vacío retorna 0 palabras y WPM "0.0" sin arrojar NaN ni error', () => {
        const result = evaluateTyping("", "algo tipeado", 300, 140);

        assert.equal(result.totalWords, 0);
        assert.equal(result.correct, 0);
        assert.equal(result.accountedWords, 0);
        assert.equal(result.wpm, '0.0');
        assert.equal(result.passed, false);
        assert.ok(!Number.isNaN(result.accountedWords));
    });

    test('2. Texto tipeado vacío (postulante no escribió nada) marca todas las palabras como omitidas', () => {
        const orig = "La Cámara de Apelaciones en lo Laboral confirmó el fallo de primera instancia.";
        const result = evaluateTyping(orig, "", 300, 140);

        assert.equal(result.totalWords, 13);
        assert.equal(result.enteredWords, 0);
        assert.equal(result.correct, 0);
        assert.equal(result.minorErrors, 0);
        assert.equal(result.omitted, 13);
        assert.equal(result.accountedWords, 0);
        assert.equal(result.wpm, '0.0');
        assert.equal(result.passed, false);
        assert.ok(result.evaluatedOrig.every(w => w.status === 'omitted'));
    });

    test('3. Ambos textos vacíos retorna resultado neutro consistente y seguro', () => {
        const result = evaluateTyping("", "", 300, 140);

        assert.equal(result.totalWords, 0);
        assert.equal(result.enteredWords, 0);
        assert.equal(result.correct, 0);
        assert.equal(result.omitted, 0);
        assert.equal(result.majorErrors, 0);
        assert.equal(result.accountedWords, 0);
        assert.equal(result.wpm, '0.0');
        assert.equal(result.passed, false);
    });

    test('4. Textos compuestos únicamente de espacios, tabs y retornos de carro se procesan como vacíos', () => {
        for (const emptySample of SPECIAL_TEXTS.emptyOrWhitespaceOnly) {
            const result = evaluateTyping(emptySample, emptySample, 300, 140);
            assert.equal(result.totalWords, 0, `Falló en muestra: "${emptySample}"`);
            assert.equal(result.enteredWords, 0);
            assert.equal(result.accountedWords, 0);
            assert.equal(result.wpm, '0.0');
            assert.equal(result.passed, false);
        }
    });

    test('5. Nombre de postulante con null, undefined o cadena de espacios activa fallback a POSTULANTE_001', () => {
        storageService.setUserName(null);
        assert.equal(storageService.getUserName(), 'POSTULANTE_001');

        storageService.setUserName(undefined);
        assert.equal(storageService.getUserName(), 'POSTULANTE_001');

        storageService.setUserName('   \t\n  ');
        assert.equal(storageService.getUserName(), 'POSTULANTE_001');
    });
});
