/**
 * Tier 4 - Escenario Real 2: Examen Judicial No Alcanzado (139.5 palabras netas)
 * Simula un caso límite de alta exigencia: el postulante tipea con gran velocidad pero comete
 * faltas mixtas (3 leves y 2 graves), alcanzando 139.5 palabras computadas.
 * Verifica que el veredicto oficial sea NO ALCANZADO (Insuficiente) y se emita el acta con los detalles.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, getTypingEvaluator, generateActaData, resetStorageService } from '../helpers/contracts.js';
import { LEGAL_TEXTS } from '../helpers/fixtures.js';

describe('Tier 4 - Escenario 2: Examen Judicial No Alcanzado (139.5 palabras computadas)', async () => {
    let mockStorage;
    let storageService;
    const { evaluateTyping } = await getTypingEvaluator();

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

    test('Postulante con 138 palabras correctas + 3 errores leves (1.5) + 2 errores graves = 139.5 palabras -> NO ALCANZADO', () => {
        storageService.setUserName('Mariana Soledad Ríos');
        const candidateName = storageService.getUserName();

        const textObject = LEGAL_TEXTS[3]; // Acuerdo Nº 27/25
        const originalWords = textObject.content.trim().split(/\s+/);
        assert.ok(originalWords.length >= 150);

        // Construir tipeo deliberado:
        // - Primeras 138 palabras: idénticas (138 correctas)
        // - Siguientes 3 palabras: con omisión de tilde o puntuación (3 errores leves = 1.5 palabras netas)
        // - Siguientes 2 palabras: sustituidas por términos erróneos (2 errores graves = 0 palabras)
        const typedWords = [...originalWords.slice(0, 138)];

        // 3 errores leves (tildes / mayúsculas):
        typedWords.push(originalWords[138].toUpperCase()); // Leve por mayúsculas
        typedWords.push(originalWords[139].toUpperCase()); // Leve por mayúsculas
        typedWords.push(originalWords[140].toUpperCase()); // Leve por mayúsculas

        // 2 errores graves (sustituciones completas):
        typedWords.push('palabraErroneaTotal1');
        typedWords.push('palabraErroneaTotal2');

        const originalSegment = originalWords.slice(0, 143).join(' ');
        const typedSegment = typedWords.join(' ');

        const evalResult = evaluateTyping(originalSegment, typedSegment, 300, 140);

        assert.equal(evalResult.correct, 138, 'Debe haber 138 correctas');
        assert.equal(evalResult.minorErrors, 3, 'Debe registrar exactamente 3 errores leves');
        assert.equal(evalResult.majorErrors, 2, 'Debe registrar exactamente 2 errores graves');
        // Cálculo de palabras netas: 138 + (3 * 0.5) = 139.5
        assert.equal(evalResult.accountedWords, 139.5, 'Cómputo neto exacto: 139.5 palabras');
        assert.equal(evalResult.passed, false, '139.5 es menor a 140 exigidas -> Reprobado');
        assert.equal(evalResult.wpm, '27.9', '139.5 / 5 min = 27.9 PPM');

        // Generación de Acta Oficial
        const resultPayload = {
            id: 2026090702,
            candidateName,
            textTitle: textObject.title,
            timeLimitMinutes: 5,
            requiredWords: 140,
            strictMode: true,
            ...evalResult
        };

        const acta = generateActaData(candidateName, resultPayload);
        assert.equal(acta.candidateName, 'Mariana Soledad Ríos');
        assert.equal(acta.veredicto, 'NO ALCANZADO (Insuficiente)');
        assert.equal(acta.accountedWords, 139.5);
        assert.equal(acta.passed, false);
        assert.equal(acta.majorErrors, 2);
        assert.equal(acta.minorErrors, 3);

        // Registro en historial
        storageService.saveSimAttempt(resultPayload);
        const history = storageService.getSimHistory();
        assert.equal(history.length, 1);
        assert.equal(history[0].passed, false);
        assert.equal(history[0].accountedWords, 139.5);
    });
});
