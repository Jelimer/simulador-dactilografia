/**
 * Tier 3 - Interacciones Cruzadas: Cambio de Postulante reflejado en Actas e Historial
 * Verifica la sincronización entre el estado global de postulante,
 * los resultados del simulador, el Acta Oficial de Evaluación y la inmutabilidad de intentos pasados.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, generateActaData, resetStorageService } from '../helpers/contracts.js';

describe('Tier 3: Cambio de Postulante reflejado en Actas e Historial', () => {
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

    test('1. Modificar nombre de postulante actualiza la sesión activa', () => {
        assert.equal(storageService.getUserName(), 'POSTULANTE_001');
        storageService.setUserName('Dra. María Laura Silveira');
        assert.equal(storageService.getUserName(), 'Dra. María Laura Silveira');
    });

    test('2. Un nuevo examen finalizado toma el nombre del postulante activo en ese momento', () => {
        storageService.setUserName('Dra. María Laura Silveira');
        const activeName = storageService.getUserName();

        const examResult = {
            id: 101,
            candidateName: activeName,
            textTitle: 'Acuerdo Nº 20/24',
            accountedWords: 142,
            wpm: '28.4',
            passed: true
        };
        storageService.saveSimAttempt(examResult);

        const history = storageService.getSimHistory();
        assert.equal(history.length, 1);
        assert.equal(history[0].candidateName, 'Dra. María Laura Silveira');
    });

    test('3. El Acta Oficial generada contiene los datos exactos del postulante y el veredicto', () => {
        const candidate = 'Dra. María Laura Silveira';
        const examResult = {
            timestamp: '07/09/2026, 09:45',
            textTitle: 'Constitución Provincial',
            timeLimitMinutes: 5,
            requiredWords: 140,
            accountedWords: 144,
            wpm: '28.8',
            majorErrors: 0,
            minorErrors: 2,
            omitted: 0,
            passed: true
        };

        const acta = generateActaData(candidate, examResult);

        assert.equal(acta.institucion, 'Poder Judicial de la Nación / Provincial');
        assert.equal(acta.titulo, 'ACTA DE EVALUACIÓN DACTILOGRÁFICA');
        assert.equal(acta.candidateName, 'Dra. María Laura Silveira');
        assert.equal(acta.veredicto, 'APROBADO (Apto Dactilográfico)');
        assert.equal(acta.accountedWords, 144);
        assert.equal(acta.wpm, '28.8');
        assert.equal(acta.passed, true);
    });

    test('4. Cambio posterior de nombre de postulante NO muta los intentos previos en el historial', () => {
        // Intento 1 con Postulante A
        storageService.setUserName('Dr. Carlos Mendoza');
        storageService.saveSimAttempt({
            id: 1,
            candidateName: storageService.getUserName(),
            accountedWords: 140
        });

        // Cambio a Postulante B
        storageService.setUserName('Dra. Silveira');
        storageService.saveSimAttempt({
            id: 2,
            candidateName: storageService.getUserName(),
            accountedWords: 145
        });

        const history = storageService.getSimHistory();
        assert.equal(history.length, 2);
        // El intento 2 tiene a Silveira
        assert.equal(history[0].candidateName, 'Dra. Silveira');
        // El intento 1 retiene inmutablemente a Carlos Mendoza
        assert.equal(history[1].candidateName, 'Dr. Carlos Mendoza');
    });

    test('5. Multi-postulante: examen desaprobado y aprobado en la misma máquina preservan veredictos en actas individuales', () => {
        const postulanteReprobado = 'Aspirante Novato';
        const resultadoReprobado = {
            accountedWords: 110,
            wpm: '22.0',
            passed: false
        };
        const acta1 = generateActaData(postulanteReprobado, resultadoReprobado);
        assert.equal(acta1.candidateName, 'Aspirante Novato');
        assert.equal(acta1.veredicto, 'NO ALCANZADO (Insuficiente)');
        assert.equal(acta1.passed, false);

        const postulanteAprobado = 'Dra. Experimentada';
        const resultadoAprobado = {
            accountedWords: 155,
            wpm: '31.0',
            passed: true
        };
        const acta2 = generateActaData(postulanteAprobado, resultadoAprobado);
        assert.equal(acta2.candidateName, 'Dra. Experimentada');
        assert.equal(acta2.veredicto, 'APROBADO (Apto Dactilográfico)');
        assert.equal(acta2.passed, true);
    });
});
