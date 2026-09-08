/**
 * Tier 4 - Escenario Real 1: Examen Judicial Completo de 5 minutos - APROBADO (140 palabras exactas)
 * Simula el flujo de concurso judicial oficial de punta a punta:
 * selección de texto oficial, configuración de 5 minutos y exigencia de 140 palabras,
 * modo estricto activado (bloqueo de backspace), tipeo a 28 PPM, cómputo neto exacto,
 * emisión de Acta Oficial con veredicto APROBADO y persistencia en historial.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, getTypingEvaluator, handleStrictKeyDown, generateActaData, resetStorageService } from '../helpers/contracts.js';
import { LEGAL_TEXTS } from '../helpers/fixtures.js';

describe('Tier 4 - Escenario 1: Examen Judicial Oficial de 5 Minutos (Aprobado con 140 palabras)', async () => {
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

    test('Ejecución completa de concurso: 140 palabras netas en 5 minutos en modo estricto -> APROBADO', () => {
        // 1. Configuración inicial del postulante
        storageService.setUserName('Dr. Carlos Alberto Mendoza');
        const candidateName = storageService.getUserName();
        assert.equal(candidateName, 'Dr. Carlos Alberto Mendoza');

        // 2. Selección del texto oficial (Constitución Provincial / Acuerdo STJ)
        const textObject = LEGAL_TEXTS[2]; // Acuerdo 20/24 Bus Federal de Justicia
        assert.ok(textObject);
        const originalText = textObject.content;
        const allOriginalWords = originalText.trim().split(/\s+/);
        assert.ok(allOriginalWords.length >= 140, 'El texto debe tener al menos 140 palabras para el examen');

        // 3. Simulación de tipeo a velocidad constante: el postulante tipea exactamente las primeras 140 palabras
        const typedWordsList = allOriginalWords.slice(0, 140);
        const typedText = typedWordsList.join(' ');

        // 4. Verificación de control de modo estricto durante el tipeo
        let warningShown = false;
        const backspaceEvent = {
            key: 'Backspace',
            preventDefault: () => {}
        };
        const strictCheck = handleStrictKeyDown(backspaceEvent, true, () => { warningShown = true; });
        assert.equal(strictCheck.prevented, true, 'El modo estricto debe impedir corregir con backspace');
        assert.equal(warningShown, true);

        // 5. Finalización del intento tras 300 segundos (5 minutos)
        const timeLimitMinutes = 5;
        const timeSpentSec = 300;
        const requiredWords = 140;

        const evalResult = evaluateTyping(originalText, typedText, timeSpentSec, requiredWords);

        // 6. Verificación de métricas del algoritmo judicial
        assert.equal(evalResult.correct, 140, 'Debe registrar exactamente 140 palabras correctas');
        assert.equal(evalResult.minorErrors, 0, '0 errores leves');
        assert.equal(evalResult.majorErrors, 0, '0 errores graves');
        assert.equal(evalResult.accountedWords, 140, 'Palabras netas computadas = 140');
        assert.equal(evalResult.wpm, '28.0', '140 palabras / 5 min = 28.0 PPM');
        assert.equal(evalResult.passed, true, 'Debe aprobar al alcanzar el umbral de 140 palabras');

        // 7. Generación y validación del Acta Oficial de Evaluación
        const resultPayload = {
            id: 2026090701,
            candidateName,
            timestamp: '07/09/2026, 10:00',
            textTitle: textObject.title,
            timeLimitMinutes,
            requiredWords,
            strictMode: true,
            ...evalResult
        };

        const acta = generateActaData(candidateName, resultPayload);
        assert.equal(acta.institucion, 'Poder Judicial de la Nación / Provincial');
        assert.equal(acta.titulo, 'ACTA DE EVALUACIÓN DACTILOGRÁFICA');
        assert.equal(acta.candidateName, 'Dr. Carlos Alberto Mendoza');
        assert.equal(acta.veredicto, 'APROBADO (Apto Dactilográfico)');
        assert.equal(acta.accountedWords, 140);
        assert.equal(acta.requiredWords, 140);
        assert.equal(acta.wpm, '28.0');
        assert.equal(acta.passed, true);

        // 8. Persistencia y auditoría en dactilografia_simulador_historial
        storageService.saveSimAttempt(resultPayload);

        const history = storageService.getSimHistory();
        assert.equal(history.length, 1);
        assert.equal(history[0].id, 2026090701);
        assert.equal(history[0].candidateName, 'Dr. Carlos Alberto Mendoza');
        assert.equal(history[0].passed, true);
        assert.equal(history[0].strictMode, true);
    });
});
