/**
 * Tier 4 - Escenario Real 5: Resiliencia Extrema ante Corrupción y Cuota Excedida Simultánea
 * Prueba de estrés crítico para concursos en producción:
 * Se inyecta JSON corrupto en las claves de historial y se bloquea el almacenamiento por cuota de 5MB.
 * El sistema debe recuperarse automáticamente, proteger la UI contra caídas (evitando el crash de línea 604),
 * activar el fallback transparente en memoria y permitir completar y auditar exámenes judiciales normalmente.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestStorage } from '../helpers/mockStorage.js';
import { getStorageService, evaluateTyping, generateActaData, resetStorageService } from '../helpers/contracts.js';

describe('Tier 4 - Escenario 5: Resiliencia Extrema (JSON Corrupto + QuotaExceeded Simultáneos)', () => {
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

    test('Recuperación transparente ante corrupción severa de datos y saturación física de almacenamiento', () => {
        // 1. Inyectar corrupción deliberada en múltiples claves existentes para verificar no-crasheo
        mockStorage.corrupt('dactilografia_teoria_historial', '<<<FATAL ERROR>>>');
        mockStorage.corrupt('dactilografia_custom_legal_texts', 'undefined');

        // 2. Inicialización del servicio: no debe arrojar ninguna excepción no controlada
        assert.doesNotThrow(() => {
            storageService.runMigrations();
        }, 'runMigrations no debe fallar con datos corruptos');

        // 3. Verificación de lecturas resilientes de claves corruptas (retornan colecciones vacías seguras)
        assert.equal(storageService.getTheoryHistory().length, 0);
        assert.equal(storageService.getCustomTexts().length, 0);

        // 4. Saneamiento de claves corruptas para restaurar estado limpio
        storageService.clearTheoryHistory();

        // 5. Bloquear físicamente el almacenamiento local simulando cuota de 5MB agotada
        mockStorage.simulateQuotaExceeded(true);

        // 6. Un postulante judicial ingresa en plena situación de almacenamiento físico bloqueado
        storageService.setUserName('Dr. Concursante Resiliente');
        assert.equal(storageService.getUserName(), 'Dr. Concursante Resiliente');

        // 6. El postulante rinde y aprueba su examen de 140 palabras
        const textToEvaluate = Array(140).fill('justicia').join(' ');
        const evalResult = evaluateTyping(textToEvaluate, textToEvaluate, 300, 140);
        assert.equal(evalResult.passed, true);
        assert.equal(evalResult.accountedWords, 140);

        const attemptPayload = {
            id: 99999,
            candidateName: storageService.getUserName(),
            timestamp: '07/09/2026, 10:30',
            textTitle: 'Examen de Emergencia Resiliente',
            passed: true,
            accountedWords: 140,
            wpm: '28.0',
            ...evalResult
        };

        // 7. Guardar intento: debe activar fallback en memoria y completar el guardado sin crasheo
        assert.doesNotThrow(() => {
            storageService.saveSimAttempt(attemptPayload);
        });

        // 8. Verificar que el examen quedó registrado en el almacenamiento en memoria
        const historyAfterSave = storageService.getSimHistory();
        assert.equal(historyAfterSave.length, 1);
        assert.equal(historyAfterSave[0].candidateName, 'Dr. Concursante Resiliente');
        assert.equal(historyAfterSave[0].passed, true);

        // 9. Emisión de Acta Oficial en modo resiliente
        const acta = generateActaData(storageService.getUserName(), attemptPayload);
        assert.equal(acta.candidateName, 'Dr. Concursante Resiliente');
        assert.equal(acta.veredicto, 'APROBADO (Apto Dactilográfico)');
        assert.equal(acta.accountedWords, 140);

        // 10. Continuidad operativa garantizada: el postulante puede seguir utilizando la app
        assert.doesNotThrow(() => {
            storageService.saveTheoryNote({ title: 'Nota de contingencia', content: 'Operación normal garantizada.' });
        });
        assert.equal(storageService.getTheoryHistory().length, 1);
    });
});
